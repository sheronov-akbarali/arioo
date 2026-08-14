import { describe, it, expect, beforeAll } from "vitest";
import { encryptCredential, decryptCredential } from "./credential-crypto";

beforeAll(() => {
  process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("credential-crypto", () => {
  it("round-trips a plaintext string through encrypt/decrypt", () => {
    const plaintext = "super-secret-token-value";
    const encrypted = encryptCredential(plaintext);
    expect(encrypted).not.toEqual(plaintext);
    expect(decryptCredential(encrypted)).toEqual(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptCredential("same-value");
    const b = encryptCredential("same-value");
    expect(a).not.toEqual(b);
  });

  it("throws when the encryption key env var is missing", () => {
    const original = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
    delete process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY;
    expect(() => encryptCredential("x")).toThrow();
    process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY = original;
  });
});
