import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { Search as SearchIcon } from "lucide-react";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { requireOrganization } from "@/lib/auth/dal";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { searchTranscripts, type TranscriptChannel } from "@/lib/search/transcripts";
import { SnippetHighlight } from "@/components/dashboard/search/snippet-highlight";

const PAGE_SIZE = 20;
const CHANNELS: TranscriptChannel[] = ["telegram", "whatsapp", "widget"];

function isTranscriptChannel(value: string | undefined): value is TranscriptChannel {
  return CHANNELS.includes(value as TranscriptChannel);
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; agentId?: string; channel?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, agentId, channel, page: pageParam } = await searchParams;
  const { organization } = await requireOrganization(locale);
  const t = await getTranslations("search");

  const orgAgents = await db
    .select({ id: aiAgents.id, name: aiAgents.name })
    .from(aiAgents)
    .where(eq(aiAgents.organizationId, organization.id));

  const trimmedQuery = (q ?? "").trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const selectedChannel = isTranscriptChannel(channel) ? channel : undefined;

  const outcome =
    trimmedQuery.length >= 2
      ? await searchTranscripts({
          organizationId: organization.id,
          query: trimmedQuery,
          agentId: agentId || undefined,
          channel: selectedChannel,
          page,
          pageSize: PAGE_SIZE,
        })
      : null;

  const buildHref = (overridePage: number) => {
    const next = new URLSearchParams();
    if (trimmedQuery) next.set("q", trimmedQuery);
    if (agentId) next.set("agentId", agentId);
    if (selectedChannel) next.set("channel", selectedChannel);
    next.set("page", String(overridePage));
    return `/search?${next.toString()}`;
  };

  const dtf = new Intl.DateTimeFormat(
    locale === "en" ? "en-US" : locale === "ru" ? "ru-RU" : "uz-UZ",
    { dateStyle: "short", timeStyle: "short" },
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card className="p-4">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <div className="relative min-w-[240px] flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder={t("placeholder")}
              minLength={2}
              required
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm"
            />
          </div>
          <select
            name="agentId"
            defaultValue={agentId ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("allAgents")}</option>
            {orgAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          <select
            name="channel"
            defaultValue={selectedChannel ?? ""}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">{t("allChannels")}</option>
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {t(`channel.${c}`)}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            {t("submit")}
          </Button>
        </form>
      </Card>

      {!outcome ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          {trimmedQuery.length > 0 ? t("tooShort") : t("emptyState")}
        </p>
      ) : !outcome.ok ? (
        <p className="py-16 text-center text-sm text-destructive">{t("searchError")}</p>
      ) : outcome.results.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">{t("noResults")}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("resultsCount", { count: outcome.totalCount })}
          </p>
          <div className="flex flex-col gap-3">
            {outcome.results.map((result) => (
              <Card key={result.messageId} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{result.agentName}</p>
                    <span className="rounded bg-muted-foreground/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {t(`channel.${result.channel}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">{dtf.format(result.createdAt)}</span>
                  </div>
                  <Link
                    href={`/chats?conversation=${result.conversationId}&message=${result.messageId}`}
                    className="text-xs font-medium text-brand hover:underline"
                  >
                    {t("viewInChat")} →
                  </Link>
                </div>
                <p className="mt-2 text-sm">
                  <SnippetHighlight snippet={result.snippet} />
                </p>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <Link
              href={buildHref(page - 1)}
              className={
                page <= 1
                  ? "pointer-events-none text-sm font-medium text-muted-foreground/50"
                  : "text-sm font-medium text-brand hover:underline"
              }
            >
              ← {t("previous")}
            </Link>
            <Link
              href={buildHref(page + 1)}
              className={
                outcome.totalCount <= page * PAGE_SIZE
                  ? "pointer-events-none text-sm font-medium text-muted-foreground/50"
                  : "text-sm font-medium text-brand hover:underline"
              }
            >
              {t("next")} →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
