import { describe, it, expect, beforeEach } from "vitest";
import { getOAuthConfig, isOAuthConfigured } from "./config";

describe("youtube OAuth config", () => {
  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "g_client";
    process.env.GOOGLE_CLIENT_SECRET = "g_secret";
  });

  it("is configured when GOOGLE_CLIENT_ID/SECRET are set", () => {
    expect(isOAuthConfigured("youtube")).toBe(true);
  });

  it("requests the youtube.readonly scope and offline access", () => {
    const config = getOAuthConfig("youtube");
    expect(config).not.toBeNull();
    expect(config?.scopes).toEqual(["https://www.googleapis.com/auth/youtube.readonly"]);
    expect(config?.tokenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(config?.extraAuthParams).toEqual({ access_type: "offline", prompt: "consent" });
  });

  it("reuses the same client credentials as the google provider", () => {
    const google = getOAuthConfig("google");
    const youtube = getOAuthConfig("youtube");
    expect(youtube?.clientId).toBe(google?.clientId);
    expect(youtube?.clientSecret).toBe(google?.clientSecret);
  });
});
