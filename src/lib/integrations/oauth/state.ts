import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

type StatePayload = { organizationId: string; provider: string };

function getSecret(): string {
  const secret = process.env.OAUTH_STATE_SIGNING_SECRET;
  if (!secret) throw new Error("OAUTH_STATE_SIGNING_SECRET is not set");
  return secret;
}

export function signOAuthState(payload: StatePayload): string {
  const nonce = randomBytes(8).toString("hex");
  const body = JSON.stringify({ ...payload, nonce });
  const bodyBase64 = Buffer.from(body).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(bodyBase64).digest("base64url");
  return `${bodyBase64}.${signature}`;
}

export function verifyOAuthState(token: string): StatePayload | null {
  const [bodyBase64, signature] = token.split(".");
  if (!bodyBase64 || !signature) return null;

  const expectedSignature = createHmac("sha256", getSecret()).update(bodyBase64).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(bodyBase64, "base64url").toString("utf8"));
    if (typeof parsed.organizationId !== "string" || typeof parsed.provider !== "string") return null;
    return { organizationId: parsed.organizationId, provider: parsed.provider };
  } catch {
    return null;
  }
}
