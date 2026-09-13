import { createHash, createPublicKey, verify } from "node:crypto";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";

/**
 * Zig's minisign public key, published on https://ziglang.org/download/.
 * Hardcoded as the trust anchor for verifying downloaded tarballs.
 */
export const ZIG_MINISIGN_PUBLIC_KEY =
  "RWSGOq2NVecA2UPNdBUZykf1CCb147pkmdtYxgb3Ti+JO/wCYvhbAb/U";

/** ASN.1 SubjectPublicKeyInfo prefix for an Ed25519 public key. */
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

/**
 * Verifies `filePath` against a minisign signature, as used by Zig releases.
 * Zig signs with the prehashed algorithm (`ED`): the file is hashed with
 * BLAKE2b-512, then the digest is verified with Ed25519.
 */
export async function verifyMinisign(
  filePath: string,
  signatureText: string,
  publicKey: string = ZIG_MINISIGN_PUBLIC_KEY,
): Promise<void> {
  const signature = parseSignature(signatureText);

  const algorithm = signature.subarray(0, 2).toString("ascii");
  if (algorithm !== "ED") {
    throw new Error(`Unsupported minisign signature algorithm "${algorithm}"`);
  }
  const signatureKeyId = signature.subarray(2, 10);
  const ed25519Signature = signature.subarray(10);

  const publicKeyBytes = Buffer.from(publicKey, "base64");
  const publicKeyId = publicKeyBytes.subarray(2, 10);
  const ed25519PublicKey = publicKeyBytes.subarray(10);

  if (!signatureKeyId.equals(publicKeyId)) {
    throw new Error(
      "minisign key ID mismatch: signature was not made by Zig's public key",
    );
  }

  const digest = await blake2b512(filePath);

  const keyObject = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, ed25519PublicKey]),
    format: "der",
    type: "spki",
  });

  // minisign's prehashed mode signs the BLAKE2b-512 digest directly.
  if (!verify(null, digest, keyObject, ed25519Signature)) {
    throw new Error("minisign signature verification failed");
  }
}

/** Extracts the per-file signature from a minisign signature file. */
function parseSignature(signatureText: string): Buffer {
  const lines = signatureText.split(/\r?\n/);
  let encoded = "";
  let afterTrustedComment = false;

  for (const line of lines) {
    if (line.startsWith("untrusted comment:")) {
      continue;
    }
    if (line.startsWith("trusted comment:")) {
      afterTrustedComment = true;
      continue;
    }
    if (afterTrustedComment) {
      continue;
    }
    const trimmed = line.trim();
    if (trimmed) {
      encoded += trimmed;
    }
  }

  if (!encoded) {
    throw new Error("minisign signature file contains no signature");
  }
  return Buffer.from(encoded, "base64");
}

async function blake2b512(filePath: string): Promise<Buffer> {
  const hash = createHash("blake2b512");
  await pipeline(createReadStream(filePath), hash);
  return hash.digest();
}
