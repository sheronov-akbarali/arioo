import { describe, expect, it } from "vitest";
import en from "./en.json";
import ru from "./ru.json";
import uz from "./uz.json";

// Guards against locale key drift: if a future PR adds/renames a key in one
// locale file without mirroring it in the others, `next-intl` would silently
// fall back to a missing-key error at runtime for that locale. Flattening
// and comparing key sets here catches it at test time instead.
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") {
    return [prefix];
  }
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("locale message key parity", () => {
  const locales: Record<string, unknown> = { uz, ru, en };
  const keySets = Object.fromEntries(
    Object.entries(locales).map(([locale, messages]) => [locale, new Set(flattenKeys(messages))]),
  ) as Record<string, Set<string>>;

  const localeNames = Object.keys(keySets);

  for (const a of localeNames) {
    for (const b of localeNames) {
      if (a >= b) continue;

      it(`${a}.json and ${b}.json have the same keys`, () => {
        const missingFromB = [...keySets[a]].filter((key) => !keySets[b].has(key));
        const missingFromA = [...keySets[b]].filter((key) => !keySets[a].has(key));

        expect(
          missingFromB,
          `Keys present in ${a}.json but missing from ${b}.json: ${missingFromB.join(", ")}`,
        ).toEqual([]);
        expect(
          missingFromA,
          `Keys present in ${b}.json but missing from ${a}.json: ${missingFromA.join(", ")}`,
        ).toEqual([]);
      });
    }
  }
});
