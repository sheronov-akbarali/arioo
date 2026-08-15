import { describe, it, expect } from "vitest";
import { buildIntegrationCredentials } from "./credential-helpers";

describe("buildIntegrationCredentials", () => {
  it("serializes secret fields into a single JSON string for encryption", () => {
    const json = buildIntegrationCredentials({ password: "hunter2", apiKey: "abc" });
    expect(JSON.parse(json!)).toEqual({ password: "hunter2", apiKey: "abc" });
  });

  it("returns null when there are no secret fields", () => {
    expect(buildIntegrationCredentials({})).toBeNull();
  });
});
