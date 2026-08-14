import { describe, expect, it, beforeAll } from "vitest";
import { encryptSessionSecret, decryptSessionSecret } from "./session-crypto";

beforeAll(() => {
  process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("session-crypto", () => {
  it("round-trips a plaintext session string", () => {
    const ciphertext = encryptSessionSecret("super-secret-session-string");
    expect(ciphertext).not.toContain("super-secret-session-string");
    expect(decryptSessionSecret(ciphertext)).toBe("super-secret-session-string");
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const a = encryptSessionSecret("same-input");
    const b = encryptSessionSecret("same-input");
    expect(a).not.toBe(b);
  });

  it("throws when the encryption key is missing", () => {
    const original = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
    delete process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
    expect(() => encryptSessionSecret("x")).toThrow();
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = original;
  });
});
