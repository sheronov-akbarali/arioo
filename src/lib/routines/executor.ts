import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { routines, type routineTriggerType } from "@/db/schema/routines";
import { createNotification } from "@/lib/notifications/actions";
import { performHandoff } from "@/lib/chats/handoff";

type TriggerType = (typeof routineTriggerType.enumValues)[number];

function fillTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? "");
}

export async function executeRoutine(
  routine: typeof routines.$inferSelect,
  context: Record<string, string>
): Promise<void> {
  const config = routine.actionConfig || {};

  if (routine.actionType === "notify") {
    await createNotification(routine.organizationId, {
      type: "system",
      title: fillTemplate(config.title || routine.name, context),
      body: fillTemplate(config.body || `Rutina ishga tushdi: ${routine.resource}`, context),
    });
    return;
  }

  if (routine.actionType === "webhook") {
    if (!config.url) return;
    try {
      await fetch(config.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine: routine.name,
          trigger: routine.triggerType,
          resource: routine.resource,
          context,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch (err) {
      console.error(`Routine webhook failed (${routine.id}):`, err);
    }
    return;
  }

  if (routine.actionType === "handoff") {
    const targetAgentId = config.targetAgentId;
    const conversationId = context.conversationId;
    if (!targetAgentId || !conversationId) return;
    await performHandoff({
      organizationId: routine.organizationId,
      conversationId,
      targetAgentId,
      reason: `Avtomatik rutina: ${routine.name} (${routine.resource})`,
    });
  }
}

/**
 * Finds every active routine matching (triggerType, resource) for an org and
 * runs its configured action. Called from real event sources — CRM deal
 * status changes, integration events, and AI-raised business events — not
 * just the schedule cron, so routines actually fire when they're supposed to.
 */
export async function fireRoutinesForEvent(
  organizationId: string,
  triggerType: TriggerType,
  resource: string,
  context: Record<string, string> = {}
): Promise<number> {
  const matching = await db
    .select()
    .from(routines)
    .where(
      and(
        eq(routines.organizationId, organizationId),
        eq(routines.status, "active"),
        eq(routines.triggerType, triggerType),
        eq(routines.resource, resource)
      )
    );

  for (const routine of matching) {
    try {
      await executeRoutine(routine, context);
    } catch (err) {
      console.error(`Routine execution failed (${routine.id}):`, err);
    }
  }

  return matching.length;
}

export async function runScheduledRoutines(): Promise<{ id: string; name: string; status: string }[]> {
  const activeRoutines = await db
    .select()
    .from(routines)
    .where(and(eq(routines.status, "active"), eq(routines.triggerType, "schedule")));

  const results: { id: string; name: string; status: string }[] = [];
  for (const routine of activeRoutines) {
    try {
      await executeRoutine(routine, {});
      results.push({ id: routine.id, name: routine.name, status: "executed" });
    } catch (err) {
      console.error(`Scheduled routine failed (${routine.id}):`, err);
      results.push({ id: routine.id, name: routine.name, status: "failed" });
    }
  }
  return results;
}
