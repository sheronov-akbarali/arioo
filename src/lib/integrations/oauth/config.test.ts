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

describe("instagram OAuth config", () => {
  beforeEach(() => {
    process.env.META_CLIENT_ID = "meta_client";
    process.env.META_CLIENT_SECRET = "meta_secret";
  });

  it("is configured when META_CLIENT_ID/SECRET are set", () => {
    expect(isOAuthConfigured("instagram")).toBe(true);
  });

  it("requests Instagram business + page scopes", () => {
    const config = getOAuthConfig("instagram");
    expect(config).not.toBeNull();
    expect(config?.scopes).toEqual([
      "instagram_basic",
      "instagram_manage_insights",
      "pages_show_list",
      "pages_read_engagement",
      "business_management",
    ]);
    expect(config?.authUrl).toBe("https://www.facebook.com/v21.0/dialog/oauth");
    expect(config?.tokenUrl).toBe("https://graph.facebook.com/v21.0/oauth/access_token");
  });
});

describe("bitrix24 OAuth config", () => {
  beforeEach(() => {
    process.env.BITRIX24_CLIENT_ID = "bx_client";
    process.env.BITRIX24_CLIENT_SECRET = "bx_secret";
  });

  it("uses the same oauth.bitrix.info host for both authorize and token endpoints", () => {
    const config = getOAuthConfig("bitrix24");
    expect(config).not.toBeNull();
    // Bitrix24's authorize and token endpoints live on the same host — a
    // mismatched authUrl host means users get sent somewhere that can't
    // complete the OAuth handshake.
    const authHost = new URL(config!.authUrl).host;
    const tokenHost = new URL(config!.tokenUrl).host;
    expect(authHost).toBe(tokenHost);
    expect(authHost).toBe("oauth.bitrix.info");
  });
});

describe("facebook OAuth config", () => {
  beforeEach(() => {
    process.env.META_CLIENT_ID = "meta_client";
    process.env.META_CLIENT_SECRET = "meta_secret";
  });

  it("is configured when META_CLIENT_ID/SECRET are set", () => {
    expect(isOAuthConfigured("facebook")).toBe(true);
  });

  it("requests page insights scopes and reuses the Meta app credentials", () => {
    const config = getOAuthConfig("facebook");
    const instagram = getOAuthConfig("instagram");
    expect(config).not.toBeNull();
    expect(config?.scopes).toEqual(["pages_show_list", "pages_read_engagement"]);
    expect(config?.clientId).toBe(instagram?.clientId);
    expect(config?.clientSecret).toBe(instagram?.clientSecret);
  });
});
