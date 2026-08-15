export function buildIntegrationCredentials(secretConfig: Record<string, string>): string | null {
  if (Object.keys(secretConfig).length === 0) return null;
  return JSON.stringify(secretConfig);
}
