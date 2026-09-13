import {
  createHash,
  generateKeyPairSync,
  sign,
  type KeyObject,
} from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "@rstest/core";
import { verifyMinisign } from "./minisign";

const KEY_ID = Buffer.from("0123456789abcdef", "hex");

function rawPublicKey(publicKey: KeyObject): Buffer {
  const jwk = publicKey.export({ format: "jwk" });
  return Buffer.from(jwk.x as string, "base64url");
}

function buildSignature(
  privateKey: KeyObject,
  publicKey: KeyObject,
  content: Buffer,
): { signatureText: string; publicKeyText: string } {
  const publicKeyText = Buffer.concat([
    Buffer.from("Ed", "ascii"),
    KEY_ID,
    rawPublicKey(publicKey),
  ]).toString("base64");

  const digest = createHash("blake2b512").update(content).digest();
  const signedMessage = Buffer.concat([Buffer.from("ED", "ascii"), digest]);
  const ed25519Signature = sign(null, signedMessage, privateKey);

  const signatureText = [
    "untrusted comment: test",
    Buffer.concat([
      Buffer.from("ED", "ascii"),
      KEY_ID,
      ed25519Signature,
    ]).toString("base64"),
    "trusted comment: test",
  ].join("\n");

  return { signatureText, publicKeyText };
}

describe("verifyMinisign", () => {
  it("accepts a valid signature", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-minisign-"));
    try {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const filePath = path.join(tmp, "zig.tar.xz");
      const content = Buffer.from("pretend tarball bytes");
      await writeFile(filePath, content);

      const { signatureText, publicKeyText } = buildSignature(
        privateKey,
        publicKey,
        content,
      );
      await expect(
        verifyMinisign(filePath, signatureText, publicKeyText),
      ).resolves.toBeUndefined();
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("rejects a tampered file", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-minisign-"));
    try {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const filePath = path.join(tmp, "zig.tar.xz");
      const original = Buffer.from("original bytes");
      await writeFile(filePath, original);

      const { signatureText, publicKeyText } = buildSignature(
        privateKey,
        publicKey,
        original,
      );
      await writeFile(filePath, "tampered bytes");
      await expect(
        verifyMinisign(filePath, signatureText, publicKeyText),
      ).rejects.toThrow("minisign signature verification failed");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it("rejects a signature from a different key", async () => {
    const tmp = await mkdtemp(path.join(os.tmpdir(), "setup-zig-minisign-"));
    try {
      const { publicKey, privateKey } = generateKeyPairSync("ed25519");
      const other = generateKeyPairSync("ed25519");
      const filePath = path.join(tmp, "zig.tar.xz");
      const content = Buffer.from("pretend tarball bytes");
      await writeFile(filePath, content);

      const { signatureText } = buildSignature(privateKey, publicKey, content);
      const otherPublicKeyText = Buffer.concat([
        Buffer.from("Ed", "ascii"),
        KEY_ID,
        rawPublicKey(other.publicKey),
      ]).toString("base64");

      await expect(
        verifyMinisign(filePath, signatureText, otherPublicKeyText),
      ).rejects.toThrow("minisign signature verification failed");
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});
