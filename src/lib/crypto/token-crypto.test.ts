import { describe, it, expect, beforeAll } from "vitest";
import { encryptToken, decryptToken } from "./token-crypto";

beforeAll(() => {
  process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("token-crypto", () => {
  it("encrypts and decrypts a token correctly", () => {
    const plain = "ya29.a0AfH6SMBabc123456_google_access_token";
    const encrypted = encryptToken(plain);
    expect(encrypted).not.toBe(plain);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("handles long and special characters in payload", () => {
    const plain = JSON.stringify({
      access_token: "tok_123",
      refresh_token: "ref_456",
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      special: "🇺🇿 O'zbekiston @#!$%^&*()",
    });
    const encrypted = encryptToken(plain);
    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encryptToken("secret_token");
    const parts = encrypted.split(":");
    // parts: iv:authTag:ciphertext
    const tampered = `${parts[0]}:${parts[1]}:tampered${parts[2]}`;
    expect(() => decryptToken(tampered)).toThrow();
  });
});
