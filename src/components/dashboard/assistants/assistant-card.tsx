import type { agentRole, agentStatus } from "@/db/schema/agents";
import { Link } from "@/i18n/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyIdButton } from "./copy-id-button";

type Agent = {
  id: string;
  name: string;
  role: (typeof agentRole.enumValues)[number];
  status: (typeof agentStatus.enumValues)[number];
};

export function AssistantCard({
  agent,
  roleLabel,
  statusLabel,
}: {
  agent: Agent;
  roleLabel: string;
  statusLabel: string;
}) {
  const initial = agent.name.trim().charAt(0).toUpperCase() || "?";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand">
              {initial}
            </span>
            <div>
              <CardTitle>
                <Link href={`/assistants/${agent.id}`}>{agent.name}</Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <span
            role="status"
            aria-label={statusLabel}
            title={statusLabel}
            className={
              "mt-1 size-2 shrink-0 rounded-full " +
              (agent.status === "active" ? "bg-green-500" : "bg-muted-foreground/40")
            }
          />
        </div>
        <CopyIdButton id={agent.id} />
      </CardHeader>
    </Card>
  );
}
