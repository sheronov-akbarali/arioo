"use server";

import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { crmDeals, crmContacts } from "@/db/schema/crm";
import { products } from "@/db/schema/products";
import { requireOrganization } from "@/lib/auth/dal";

export type SearchResultItem = {
  id: string;
  category: "agents" | "deals" | "contacts" | "products" | "pages";
  title: string;
  subtitle?: string;
  href: string;
};

const STATIC_PAGES = [
  { title: "Bosh sahifa (Dashboard)", subtitle: "Asosiy ko'rsatkichlar", href: "/dashboard", keywords: ["dashboard", "home", "bosh"] },
  { title: "AI Xodimlar", subtitle: "Barcha virtual xodimlar ro'yxati", href: "/assistants", keywords: ["assistants", "agent", "xodim", "bot"] },
  { title: "Yangi AI xodim yaratish", subtitle: "Sotuv, support yoki HR assistent", href: "/assistants/new", keywords: ["new", "create", "yangi", "assistant"] },
  { title: "CRM: Bitimlar (Kanban)", subtitle: "Lidlar va muzokaralar doskasi", href: "/crm", keywords: ["crm", "deals", "bitim", "kanban", "lid"] },
  { title: "CRM: Kontaktlar", subtitle: "Mijozlar kontaktlar bazasi", href: "/crm/contacts", keywords: ["contacts", "kontakt", "mijoz", "telefon"] },
  { title: "Suhbatlar (Chats)", subtitle: "Mijozlar bilan barcha chatlar", href: "/chats", keywords: ["chats", "suhbat", "dialog", "xabar"] },
  { title: "Bilimlar bazasi", subtitle: "Kompaniya hujjatlari va RAG", href: "/knowledge-bases", keywords: ["knowledge", "bilim", "fayl", "rag"] },
  { title: "Mahsulotlar katalogi", subtitle: "Tovarlar va xizmatlar narxi", href: "/products", keywords: ["products", "mahsulot", "tovar", "narx"] },
  { title: "Integratsiyalar", subtitle: "Telegram, WhatsApp, CRM ulash", href: "/integrations", keywords: ["integrations", "telegram", "whatsapp", "ulash"] },
  { title: "Statistika va Monitoring", subtitle: "Xarajat va xabarlar tahlili", href: "/statistics", keywords: ["stats", "statistika", "xarajat", "token"] },
  { title: "Marketing Analitikasi", subtitle: "Telegram, YouTube, Sayt trafigi", href: "/statistics/marketing", keywords: ["marketing", "kanal", "views", "trafig"] },
  { title: "Billing va Hisob", subtitle: "Balansni to'ldirish va tariflar", href: "/billing", keywords: ["billing", "hisob", "balans", "tarif", "payme", "click"] },
  { title: "Referral Dasturi", subtitle: "Do'stlarni taklif qilish va daromad", href: "/referral-program", keywords: ["referral", "taklif", "bonus", "daromad"] },
  { title: "Loyiha sozlamalari", subtitle: "Tashkilot nomi va ma'lumotlari", href: "/settings/project", keywords: ["settings", "sozlamalar", "proyekt", "tashkilot"] },
  { title: "Jamoa boshqaruvi", subtitle: "A'zolarni taklif qilish", href: "/settings/team", keywords: ["team", "jamoa", "user", "admin"] },
];

export async function searchGlobal(
  locale: string,
  query: string
): Promise<SearchResultItem[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResultItem[] = [];

  // Match static pages
  for (const page of STATIC_PAGES) {
    if (
      page.title.toLowerCase().includes(q) ||
      page.subtitle.toLowerCase().includes(q) ||
      page.keywords.some((k) => k.includes(q))
    ) {
      results.push({
        id: `page-${page.href}`,
        category: "pages",
        title: page.title,
        subtitle: page.subtitle,
        href: `/${locale}${page.href}`,
      });
    }
  }

  try {
    const { organization } = await requireOrganization(locale);

    // Search AI Agents
    const agents = await db
      .select()
      .from(aiAgents)
      .where(
        and(
          eq(aiAgents.organizationId, organization.id),
          or(ilike(aiAgents.name, `%${q}%`), ilike(aiAgents.role, `%${q}%`))
        )
      )
      .limit(5);

    for (const a of agents) {
      results.push({
        id: `agent-${a.id}`,
        category: "agents",
        title: a.name,
        subtitle: `AI Xodim (${a.role})`,
        href: `/${locale}/assistants/${a.id}/ai`,
      });
    }

    // Search Deals
    const deals = await db
      .select()
      .from(crmDeals)
      .where(
        and(
          eq(crmDeals.organizationId, organization.id),
          ilike(crmDeals.title, `%${q}%`)
        )
      )
      .limit(5);

    for (const d of deals) {
      results.push({
        id: `deal-${d.id}`,
        category: "deals",
        title: d.title,
        subtitle: `${d.value ? Number(d.value).toLocaleString("uz-UZ") : 0} UZS`,
        href: `/${locale}/crm`,
      });
    }

    // Search Contacts
    const contacts = await db
      .select()
      .from(crmContacts)
      .where(
        and(
          eq(crmContacts.organizationId, organization.id),
          or(
            ilike(crmContacts.name, `%${q}%`),
            ilike(crmContacts.phone, `%${q}%`),
            ilike(crmContacts.email, `%${q}%`)
          )
        )
      )
      .limit(5);

    for (const c of contacts) {
      results.push({
        id: `contact-${c.id}`,
        category: "contacts",
        title: c.name,
        subtitle: `${c.phone || c.email || "Kontakt"}`,
        href: `/${locale}/crm/contacts`,
      });
    }

    // Search Products
    const prods = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.organizationId, organization.id),
          ilike(products.name, `%${q}%`)
        )
      )
      .limit(5);

    for (const p of prods) {
      results.push({
        id: `product-${p.id}`,
        category: "products",
        title: p.name,
        subtitle: `${(p.priceUZS || 0).toLocaleString("uz-UZ")} UZS`,
        href: `/${locale}/products`,
      });
    }
  } catch (err) {
    console.error("Global search DB error:", err);
  }

  return results;
}
