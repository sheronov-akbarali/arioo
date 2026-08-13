import "server-only";
import { z } from "zod";

// FormData.get() returns "" or null for empty optional fields; z.coerce.number()
// turns "" into 0 instead of failing, which would silently store a wrong value
// for fields that mean "unset" (e.g. topP, maxAttempts). These helpers normalize
// "empty" to null before the underlying schema runs.
function emptyToNull(value: unknown): unknown {
  return value === "" || value === null || value === undefined ? null : value;
}

export function optionalNumber(min: number, max: number) {
  return z.preprocess(emptyToNull, z.coerce.number().min(min).max(max).nullable());
}

export function optionalText(maxLength: number) {
  return z.preprocess(emptyToNull, z.string().trim().max(maxLength).nullable());
}

export function optionalEnum<const T extends [string, ...string[]]>(values: T) {
  return z.preprocess(emptyToNull, z.enum(values).nullable());
}
