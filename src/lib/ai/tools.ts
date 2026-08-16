import "server-only";
import { tool, dynamicTool, jsonSchema, type ToolSet } from "ai";
import { z } from "zod";
import { and, eq, ilike, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { products } from "@/db/schema/products";
import { crmContacts, crmDeals } from "@/db/schema/crm";
import { approvals } from "@/db/schema/approvals";
import { createPaymentInvoice } from "@/lib/billing/in-chat-payments";
import { fireRoutinesForEvent } from "@/lib/routines/executor";
import { performHandoff } from "@/lib/chats/handoff";
import { recordConversationConversion } from "./ab-testing";
import { createCalendarBooking, isGoogleCalendarConnected } from "@/lib/integrations/google-calendar";
import { listMcpTools, callMcpTool } from "./mcp-client";
import { integrations } from "@/db/schema/integrations";
import { decryptCredential } from "@/lib/integrations/credential-crypto";
import { OneCClient } from "@/lib/integrations/onec/client";

export type ToolId =
  | "createPaymentInvoice"
  | "checkProductInfo"
  | "createCrmLead"
  | "triggerBusinessEvent"
  | "bookCalendarAppointment"
  | "customMcpTools";

export const AVAILABLE_TOOL_IDS: ToolId[] = [
  "createPaymentInvoice",
  "checkProductInfo",
  "createCrmLead",
  "triggerBusinessEvent",
  "bookCalendarAppointment",
  "customMcpTools",
];

type ToolContext = {
  organizationId: string;
  agentId: string;
  conversationId: string;
};

function makePaymentTool(ctx: ToolContext) {
  return tool({
    description:
      "Mijoz mahsulot yoki xizmatni xarid qilishga rozi bo'lganda to'lov havolalarini (Click, Payme, Uzum) yaratish.",
    inputSchema: z.object({
      amountUzs: z.number().describe("To'lov summasi (so'mda)"),
      dealTitle: z.string().describe("Mahsulot yoki xizmat nomi"),
      customerName: z.string().optional().describe("Xaridor ismi"),
      customerPhone: z.string().optional().describe("Xaridor telefon raqami"),
    }),
    execute: async (input) => {
      try {
        const invoice = await createPaymentInvoice({
          organizationId: ctx.organizationId,
          agentId: ctx.agentId,
          amountUzs: input.amountUzs,
          dealTitle: input.dealTitle,
          contactName: input.customerName,
          contactPhone: input.customerPhone,
        });
        await recordConversationConversion(ctx.conversationId);
        return invoice;
      } catch (err) {
        console.error("Failed to create in-chat payment invoice:", err);
        return { error: "To'lov havolasini yaratib bo'lmadi" };
      }
    },
  });
}

async function lookupOneCProducts(organizationId: string, query: string) {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "oneC")));

  if (!row || row.status === "archived" || !row.credentialsEncrypted) return null;

  try {
    const config = (row.config as Record<string, string>) || {};
    const secrets = JSON.parse(decryptCredential(row.credentialsEncrypted)) as Record<string, string>;
    const client = new OneCClient({ endpoint: config.baseUrl, username: secrets.login, password: secrets.password });
    const products = await client.getProducts();
    const lower = query.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)).slice(0, 5);
  } catch (err) {
    console.warn("1C product lookup failed, falling back to local catalog:", err);
    return null;
  }
}

function makeProductLookupTool(ctx: ToolContext) {
  return tool({
    description: "Tashkilotning mahsulot/xizmat katalogidan (yoki ulangan bo'lsa 1C inventarizatsiyasidan) nom bo'yicha narx va holatni qidirish.",
    inputSchema: z.object({
      query: z.string().describe("Mahsulot yoki xizmat nomi bo'yicha qidiruv so'zi"),
    }),
    execute: async ({ query }) => {
      const oneCResults = await lookupOneCProducts(ctx.organizationId, query);
      if (oneCResults) {
        if (oneCResults.length === 0) return { found: false, message: "Bunday mahsulot 1C tizimida topilmadi", source: "1C" };
        return { found: true, source: "1C", products: oneCResults.map((p) => ({ name: p.name, priceUZS: p.price, stock: p.stock })) };
      }

      const rows = await db
        .select({ name: products.name, priceUZS: products.priceUZS, status: products.status, type: products.type })
        .from(products)
        .where(and(eq(products.organizationId, ctx.organizationId), ilike(products.name, `%${query}%`)))
        .limit(5);
      if (rows.length === 0) return { found: false, message: "Bunday mahsulot katalogda topilmadi" };
      return { found: true, source: "catalog", products: rows };
    },
  });
}

function makeCrmLeadTool(ctx: ToolContext) {
  return tool({
    description:
      "Mijozning ismi/telefon raqamini CRM'ga lid sifatida saqlash (to'lovsiz, masalan qayta bog'lanish uchun).",
    inputSchema: z.object({
      name: z.string().describe("Mijoz ismi"),
      phone: z.string().optional().describe("Telefon raqami"),
      note: z.string().optional().describe("Qisqa izoh, nima haqida suhbat bo'ldi"),
    }),
    execute: async ({ name, phone, note }) => {
      try {
        const [contact] = await db
          .insert(crmContacts)
          .values({ organizationId: ctx.organizationId, name, phone: phone || null, notes: note || null })
          .returning();
        await db.insert(crmDeals).values({
          organizationId: ctx.organizationId,
          contactId: contact.id,
          agentId: ctx.agentId,
          title: note || `Lid: ${name}`,
          status: "new",
        });
        return { saved: true };
      } catch (err) {
        console.error("Failed to save CRM lead:", err);
        return { saved: false, error: "Lidni saqlab bo'lmadi" };
      }
    },
  });
}

function makeBusinessEventTool(ctx: ToolContext) {
  return tool({
    description:
      "Ichki avtomatlashtirish (Routines) qoidalarini ishga tushiradigan biznes hodisasini qayd etish (masalan 'urgent_complaint', 'ready_to_buy').",
    inputSchema: z.object({
      eventName: z.string().describe("Hodisa nomi, lotin harflari va pastki chiziq bilan, masalan urgent_complaint"),
      details: z.string().optional().describe("Qisqa tavsif"),
    }),
    execute: async ({ eventName, details }) => {
      const firedCount = await fireRoutinesForEvent(ctx.organizationId, "ai_event", eventName, {
        details: details || "",
        conversationId: ctx.conversationId,
      });
      return { fired: firedCount };
    },
  });
}

function makeCalendarBookingTool(ctx: ToolContext) {
  return tool({
    description: "Mijoz bilan uchrashuv/qo'ng'iroq vaqtini Google Calendar'ga bron qilish.",
    inputSchema: z.object({
      summary: z.string().describe("Uchrashuv sarlavhasi, masalan 'Mijoz bilan konsultatsiya'"),
      startISO: z.string().describe("Boshlanish vaqti ISO 8601 formatida, masalan 2026-08-20T10:00:00+05:00"),
      endISO: z.string().describe("Tugash vaqti ISO 8601 formatida"),
      attendeeEmail: z.string().optional().describe("Mijozning email manzili (bo'lsa)"),
      description: z.string().optional().describe("Qo'shimcha izoh"),
    }),
    execute: async (input) => {
      try {
        const booking = await createCalendarBooking({
          organizationId: ctx.organizationId,
          summary: input.summary,
          startISO: input.startISO,
          endISO: input.endISO,
          attendeeEmail: input.attendeeEmail,
          description: input.description,
        });
        return { booked: true, link: booking.htmlLink };
      } catch (err) {
        console.error("Calendar booking failed:", err);
        return { booked: false, error: err instanceof Error ? err.message : "Bron qilib bo'lmadi" };
      }
    },
  });
}

/** Always available regardless of the Tools panel — a safety mechanism, not an optional integration. */
function makeEscalationTool(ctx: ToolContext) {
  return tool({
    description:
      "Agar mijozning savolига ishonchli javob bera olmasangiz, muammo murakkab yoki sezgir bo'lsa (shikoyat, pul qaytarish, noaniq holat), inson operatorga ko'rib chiqish uchun yuboring.",
    inputSchema: z.object({
      reason: z.string().describe("Nima uchun inson yordami kerakligi haqida qisqa izoh"),
    }),
    execute: async ({ reason }) => {
      await db.insert(approvals).values({
        agentId: ctx.agentId,
        conversationId: ctx.conversationId,
        type: "low_confidence",
        payload: { reason },
        status: "pending",
      });
      return { escalated: true, message: "Operatorga xabar berildi, tez orada siz bilan bog'lanishadi." };
    },
  });
}

async function makeHandoffTool(ctx: ToolContext) {
  const otherAgents = await db
    .select({ id: aiAgents.id, name: aiAgents.name, role: aiAgents.role })
    .from(aiAgents)
    .where(and(eq(aiAgents.organizationId, ctx.organizationId), ne(aiAgents.id, ctx.agentId)));

  if (otherAgents.length === 0) return null;

  return {
    tool: tool({
      description:
        `Agar mijozning so'rovi boshqa mutaxassis AI xodimga tegishli bo'lsa, suhbatni o'sha xodimga uzating. Mavjud xodimlar: ${otherAgents.map((a) => `${a.name} (${a.role}, id: ${a.id})`).join(", ")}`,
      inputSchema: z.object({
        targetAgentId: z.enum(otherAgents.map((a) => a.id) as [string, ...string[]]).describe("Uzatiladigan agent ID'si"),
        reason: z.string().describe("Nima uchun uzatilyapti"),
      }),
      execute: async ({ targetAgentId, reason }) => {
        const result = await performHandoff({
          organizationId: ctx.organizationId,
          conversationId: ctx.conversationId,
          targetAgentId,
          reason,
        });
        return result;
      },
    }),
    agentList: otherAgents,
  };
}

/** Builds the AI SDK tool set for a message turn: the agent's toggled
 * integration tools plus always-on safety tools (escalation, handoff). */
export async function buildAgentTools(agent: typeof aiAgents.$inferSelect, conversationId: string) {
  const ctx: ToolContext = { organizationId: agent.organizationId, agentId: agent.id, conversationId };
  const enabled = new Set(agent.enabledToolIds ?? []);

  const tools: ToolSet = {};

  if (enabled.has("createPaymentInvoice")) tools.createPaymentInvoice = makePaymentTool(ctx);
  if (enabled.has("checkProductInfo")) tools.checkProductInfo = makeProductLookupTool(ctx);
  if (enabled.has("createCrmLead")) tools.createCrmLead = makeCrmLeadTool(ctx);
  if (enabled.has("triggerBusinessEvent")) tools.triggerBusinessEvent = makeBusinessEventTool(ctx);
  if (enabled.has("bookCalendarAppointment") && (await isGoogleCalendarConnected(ctx.organizationId))) {
    tools.bookCalendarAppointment = makeCalendarBookingTool(ctx);
  }
  if (enabled.has("customMcpTools")) {
    const mcp = await listMcpTools(ctx.organizationId);
    if (mcp) {
      for (const def of mcp.tools.slice(0, 8)) {
        tools[`mcp_${def.name}`] = dynamicTool({
          description: def.description || `Custom MCP tool: ${def.name}`,
          inputSchema: jsonSchema(def.inputSchema as never),
          execute: async (input) => {
            try {
              return await callMcpTool(mcp.connection, def.name, input as Record<string, unknown>);
            } catch (err) {
              console.error(`MCP tool ${def.name} failed:`, err);
              return { error: "Tashqi vositani chaqirishda xatolik" };
            }
          },
        });
      }
    }
  }

  tools.escalateToHuman = makeEscalationTool(ctx);

  const handoff = await makeHandoffTool(ctx);
  let handoffPromptNote = "";
  if (handoff) {
    tools.handoffToAgent = handoff.tool;
    handoffPromptNote = `\n\nBoshqa AI xodimlar mavjud: ${handoff.agentList.map((a) => a.name).join(", ")}. Agar so'rov ularga tegishli bo'lsa 'handoffToAgent' funksiyasidan foydalaning.`;
  }

  return { tools, handoffPromptNote };
}
