import { describe, expect, it } from "vitest";
import { splitIntoChunks } from "./knowledge-embed";

describe("splitIntoChunks", () => {
  it("returns an empty array for blank input", () => {
    expect(splitIntoChunks("   \n  ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = splitIntoChunks("Qisqa matn.");
    expect(chunks).toEqual(["Qisqa matn."]);
  });

  it("splits long text into multiple overlapping chunks", () => {
    const longText = "a".repeat(2000);
    const chunks = splitIntoChunks(longText);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(800);
    }
  });
});
