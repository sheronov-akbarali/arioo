import { Globe, Send, MessageCircle, PhoneCall, Database, BookOpen, type LucideIcon } from "lucide-react";

export const DEPARTMENT_KEYS = ["sales", "support", "hr", "marketing"] as const;
export type Department = (typeof DEPARTMENT_KEYS)[number];

export const SOURCE_KEYS = ["website", "telegram", "whatsapp", "calls"] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const SYSTEM_KEYS = ["crm", "knowledge"] as const;
export type SystemKey = (typeof SYSTEM_KEYS)[number];

export const SOURCE_ICONS: Record<SourceKey, LucideIcon> = {
  website: Globe,
  telegram: Send,
  whatsapp: MessageCircle,
  calls: PhoneCall,
};

export const SYSTEM_ICONS: Record<SystemKey, LucideIcon> = {
  crm: Database,
  knowledge: BookOpen,
};

// Each department groups the same 4 real Arioo channels into two labeled
// groups of two. The grouping (and each group's i18n heading) differs per
// department, mirroring worken.ru's per-scenario grouping, while the
// underlying channels stay Arioo's actual ones — never invented
// integrations like Avito/HH.ru/Zoom/SIP.
export const DEPARTMENT_SOURCE_GROUPS: Record<Department, [SourceKey[], SourceKey[]]> = {
  sales: [
    ["website", "telegram"],
    ["whatsapp", "calls"],
  ],
  support: [
    ["telegram", "whatsapp"],
    ["website", "calls"],
  ],
  hr: [
    ["website", "calls"],
    ["telegram", "whatsapp"],
  ],
  marketing: [
    ["whatsapp", "telegram"],
    ["website", "calls"],
  ],
};

// Each system node exposes exactly two demo "remote tools" in its
// connection panel — shared across departments (the panel demonstrates the
// interaction pattern, not a per-department-unique tool catalog).
export const CONNECTION_TOOL_KEYS: Record<SystemKey, [string, string]> = {
  crm: ["createDeal", "updateStage"],
  knowledge: ["searchDocs", "suggestAnswer"],
};
