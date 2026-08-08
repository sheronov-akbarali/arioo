// Static catalog — matches the channels/integrations already committed to in
// CLAUDE.md's roadmap (phases 4-5), not a live-connectable list yet (no OAuth
// backend exists for any of these). Categories mirror worken.ru's tagging
// (Chat/CRM/Git/...) but the provider set is Arioo's own differentiated
// lineup (WhatsApp + OLX.uz instead of Avito/VK/Odnoklassniki/HeadHunter).
export type IntegrationCategory = "chat" | "marketplace" | "crm" | "voice" | "files" | "git" | "other";

export type IntegrationProvider = {
  id: string;
  categories: IntegrationCategory[];
  phase: number;
};

export const INTEGRATION_PROVIDERS: IntegrationProvider[] = [
  { id: "telegram", categories: ["chat"], phase: 4 },
  { id: "whatsapp", categories: ["chat"], phase: 4 },
  { id: "websiteWidget", categories: ["chat"], phase: 4 },
  { id: "olx", categories: ["marketplace"], phase: 4 },
  { id: "sip", categories: ["voice"], phase: 4 },
  { id: "amocrm", categories: ["crm"], phase: 5 },
  { id: "bitrix24", categories: ["crm"], phase: 5 },
  { id: "googleWorkspace", categories: ["files"], phase: 5 },
  { id: "github", categories: ["git"], phase: 5 },
  { id: "oneC", categories: ["crm"], phase: 5 },
  { id: "customMcp", categories: ["other"], phase: 5 },
];
