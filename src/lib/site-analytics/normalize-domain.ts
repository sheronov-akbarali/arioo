const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Accepts a bare host ("example.uz") or a pasted URL ("https://example.uz/pricing")
 * and returns just the lowercased hostname, or null if it doesn't look like a domain.
 */
export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//, "");
  const host = withoutProtocol.split(/[/?#]/)[0].split(":")[0];

  return HOSTNAME_RE.test(host) ? host : null;
}
