import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrations } from "@/db/schema/integrations";
import { decryptCredential } from "@/lib/integrations/credential-crypto";

export type McpToolDefinition = {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
};

type McpConnection = { url: string; headers: Record<string, string> };

async function loadMcpConnection(organizationId: string): Promise<McpConnection | null> {
  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.organizationId, organizationId), eq(integrations.providerId, "customMcp")));

  if (!row || row.status === "archived") return null;

  const config = (row.config as Record<string, string>) || {};
  const url = config.url;
  if (!url) return null;

  const headers: Record<string, string> = {};
  if (row.credentialsEncrypted) {
    try {
      const secrets = JSON.parse(decryptCredential(row.credentialsEncrypted)) as Record<string, string>;
      const headerKeys: string[] = config.headerKeys ? JSON.parse(config.headerKeys) : [];
      headerKeys.forEach((key, index) => {
        const value = secrets[`header_${index}_${key}`];
        if (key && value) headers[key] = value;
      });
    } catch {
      // ignore malformed stored headers, connect without them
    }
  }

  return { url, headers };
}

async function mcpRpc(connection: McpConnection, method: string, params: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(connection.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...connection.headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: crypto.randomUUID(), method, params }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`MCP server responded ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "MCP error");
  return data.result;
}

/** Lists the tools exposed by the org's connected Custom MCP Server. Real
 * MCP JSON-RPC 2.0 client (tools/list) — returns [] if not connected or
 * unreachable rather than throwing, since this feeds an optional tool set. */
export async function listMcpTools(organizationId: string): Promise<{ connection: McpConnection; tools: McpToolDefinition[] } | null> {
  const connection = await loadMcpConnection(organizationId);
  if (!connection) return null;

  try {
    const result = (await mcpRpc(connection, "tools/list", {})) as { tools?: McpToolDefinition[] };
    return { connection, tools: result.tools ?? [] };
  } catch (error) {
    console.warn("Custom MCP tools/list failed:", error);
    return null;
  }
}

export async function callMcpTool(connection: McpConnection, name: string, args: Record<string, unknown>): Promise<unknown> {
  return mcpRpc(connection, "tools/call", { name, arguments: args });
}
