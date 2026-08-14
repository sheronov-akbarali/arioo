export type IntegrationCategory =
  | "chat"
  | "marketplace"
  | "crm"
  | "voice"
  | "files"
  | "calendar"
  | "git"
  | "other";

export type ConnectionMode = "oauth" | "form" | "wizard" | "special";

export type ProviderConfig = {
  id: string;
  categories: IntegrationCategory[];
  connectionMode: ConnectionMode;
  oauth?: { envPrefix: string; scopes: string[] };
};

export const INTEGRATION_PROVIDERS = [
  { id: "telegram", categories: ["chat"], connectionMode: "special" },
  { id: "whatsapp", categories: ["chat"], connectionMode: "special" },
  { id: "websiteWidget", categories: ["chat"], connectionMode: "special" },
  { id: "olx", categories: ["marketplace"], connectionMode: "special" },
  { id: "sip", categories: ["voice"], connectionMode: "form" },
  { id: "oneC", categories: ["crm"], connectionMode: "form" },
  { id: "customMcp", categories: ["other"], connectionMode: "form" },
  { id: "vk", categories: ["chat"], connectionMode: "form" },
  {
    id: "amocrm",
    categories: ["crm"],
    connectionMode: "oauth",
    oauth: { envPrefix: "AMOCRM", scopes: [] },
  },
  {
    id: "bitrix24",
    categories: ["crm"],
    connectionMode: "oauth",
    oauth: { envPrefix: "BITRIX24", scopes: ["im", "imbot", "imopenlines", "crm", "user_basic"] },
  },
  {
    id: "google",
    categories: ["files", "calendar"],
    connectionMode: "oauth",
    oauth: {
      envPrefix: "GOOGLE",
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
    },
  },
  {
    id: "github",
    categories: ["git"],
    connectionMode: "oauth",
    oauth: { envPrefix: "GITHUB", scopes: ["repo", "read:user"] },
  },
  {
    id: "headhunter",
    categories: ["chat"],
    connectionMode: "oauth",
    oauth: { envPrefix: "HEADHUNTER", scopes: [] },
  },
] as const satisfies readonly ProviderConfig[];

export type ProviderId = (typeof INTEGRATION_PROVIDERS)[number]["id"];
