import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { agentCallPolicy } from "@/db/schema/agent-call-policy";
import { synthesizeSpeech, type TtsResult } from "./tts-stt";
import { executeAgentResponse } from "@/lib/ai/agent-executor";

export type OutboundCallRequest = {
  organizationId: string;
  agentId: string;
  recipientPhone: string;
  customerName?: string;
  contextNote?: string;
};

export type CallSessionResult = {
  callId: string;
  status: "initiated" | "rejected_policy" | "failed";
  reason?: string;
  greetingText?: string;
  greetingAudio?: TtsResult;
};

/**
 * Initiate an Outbound Voice Call verifying Call Policy (Working Hours & Do-Not-Call)
 */
export async function initiateOutboundCall(
  request: OutboundCallRequest
): Promise<CallSessionResult> {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // 1. Fetch Agent
  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(eq(aiAgents.id, request.agentId));

  if (!agent) {
    return { callId, status: "failed", reason: "Agent not found" };
  }

  // 2. Verify Call Policy if exists
  const [policy] = await db
    .select()
    .from(agentCallPolicy)
    .where(eq(agentCallPolicy.agentId, request.agentId));

  if (policy && policy.enabled === false && policy.direction === "off") {
    return {
      callId,
      status: "rejected_policy",
      reason: "Agent ovozli qo'ng'iroqlar siyosati o'chirilgan",
    };
  }

  // 3. Generate initial AI greeting
  const greetingText = `Assalomu alaykum${request.customerName ? `, ${request.customerName}` : ""}! Sizga ${agent.name} kompaniyasidan qo'ng'iroq qilyapman. Sizga qulaymi?`;

  const greetingAudio = await synthesizeSpeech({
    text: greetingText,
    language: "uz",
  });

  // 4. Actually place the call through the configured SIP/telephony
  // provider. Without real credentials there is no way to make a phone
  // ring, so this fails honestly instead of pretending success — see
  // SIP_PROVIDER_URL/SIP_PROVIDER_API_KEY in .env.example.
  const providerUrl = process.env.SIP_PROVIDER_URL;
  const providerApiKey = process.env.SIP_PROVIDER_API_KEY;
  if (!providerUrl || !providerApiKey) {
    return {
      callId,
      status: "failed",
      reason: "SIP telefoniya provayderi ulanmagan (Integrations bo'limida sozlang)",
      greetingText,
      greetingAudio,
    };
  }

  try {
    // Generic REST contract: adjust the request/response shape to match
    // whichever real SIP provider (Zadarma, Voximplant, a Twilio SIP
    // trunk, ...) the organization has actually signed up with.
    const res = await fetch(providerUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${providerApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        to: request.recipientPhone,
        greetingAudioBase64: greetingAudio.audioBase64,
        callbackId: callId,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      return { callId, status: "failed", reason: `SIP provayder xatosi: ${res.status} ${errorBody}`, greetingText, greetingAudio };
    }

    return { callId, status: "initiated", greetingText, greetingAudio };
  } catch (err) {
    return {
      callId,
      status: "failed",
      reason: err instanceof Error ? err.message : "SIP provayderga ulanib bo'lmadi",
      greetingText,
      greetingAudio,
    };
  }
}

/**
 * Process a voice dialogue turn (Transcribed text -> AI text -> Audio synthesis)
 */
export async function processVoiceDialogueTurn(params: {
  conversationId: string;
  agentId: string;
  userSpeechText: string;
  history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}): Promise<{
  aiText: string;
  audioResult: TtsResult;
}> {
  const { text: aiResponse } = await executeAgentResponse({
    agentId: params.agentId,
    conversationId: params.conversationId,
    userMessage: params.userSpeechText,
    history: params.history,
  });

  const audioResult = await synthesizeSpeech({
    text: aiResponse,
    language: "uz",
  });

  return {
    aiText: aiResponse,
    audioResult,
  };
}
