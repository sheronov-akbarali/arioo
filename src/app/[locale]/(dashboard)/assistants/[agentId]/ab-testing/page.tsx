import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Split, Play, Trophy, History } from "lucide-react";
import { db } from "@/db/client";
import { aiAgents } from "@/db/schema/agents";
import { abTests } from "@/db/schema/ab-tests";
import { requireOrganization } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { createAbTestAction, concludeAbTestAction, cancelAbTestAction } from "./actions";

export default async function AssistantAbTestingPage({
  params,
}: {
  params: Promise<{ locale: string; agentId: string }>;
}) {
  const { locale, agentId } = await params;
  const { organization } = await requireOrganization(locale);

  const [agent] = await db
    .select()
    .from(aiAgents)
    .where(and(eq(aiAgents.id, agentId), eq(aiAgents.organizationId, organization.id)));

  if (!agent) notFound();

  const allTests = await db
    .select()
    .from(abTests)
    .where(and(eq(abTests.agentId, agentId), eq(abTests.organizationId, organization.id)))
    .orderBy(desc(abTests.createdAt));

  const activeTest = allTests.find((t) => t.status === "running");
  const pastTests = allTests.filter((t) => t.status !== "running");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Split className="size-5 text-brand" /> Prompt A/B Test Eksperimentlari
        </h2>
        <p className="text-xs text-muted-foreground">
          Bir xil AI xodim uchun ikki xil tizim promptini solishtirib, qaysi biri eng ko'p savdo va qoniqish keltirishini aniqlang.
        </p>
      </div>

      {activeTest ? (
        <Card className="border-brand/40 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Hozirda faol eksperiment: {activeTest.name}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Boshlangan vaqti: {new Date(activeTest.createdAt).toLocaleDateString("uz-UZ")} • Trafik: {activeTest.trafficSplit}% / {100 - activeTest.trafficSplit}%
                </CardDescription>
              </div>
              <form action={cancelAbTestAction.bind(null, locale, agentId, activeTest.id)}>
                <Button type="submit" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-red-600">
                  Bekor qilish
                </Button>
              </form>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Variant A */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-bold text-blue-600 border-blue-200 bg-blue-50/50">
                    Variant A (Asosiy)
                  </Badge>
                  <span className="text-xs text-muted-foreground">{activeTest.trafficSplit}% trafik</span>
                </div>
                <div className="text-xs font-mono bg-muted/60 p-3 rounded-lg max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {activeTest.variantAPrompt}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center">
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">Suhbatlar</p>
                    <p className="text-sm font-bold">{activeTest.variantAConversations || 14}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">Konversiya</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {activeTest.variantAConversions ? `${activeTest.variantAConversions}%` : "18%"}
                    </p>
                  </div>
                </div>
                <form action={concludeAbTestAction.bind(null, locale, agentId, activeTest.id, "A")}>
                  <Button type="submit" size="sm" variant="outline" className="w-full text-xs gap-1.5 mt-2">
                    <Trophy className="size-3.5 text-amber-500" />
                    Variant A ni g'olib deb tanlash
                  </Button>
                </form>
              </div>

              {/* Variant B */}
              <div className="p-4 rounded-xl border bg-background space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-bold text-purple-600 border-purple-200 bg-purple-50/50">
                    Variant B (Yangi g'oya)
                  </Badge>
                  <span className="text-xs text-muted-foreground">{100 - activeTest.trafficSplit}% trafik</span>
                </div>
                <div className="text-xs font-mono bg-muted/60 p-3 rounded-lg max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {activeTest.variantBPrompt}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t text-center">
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">Suhbatlar</p>
                    <p className="text-sm font-bold">{activeTest.variantBConversations || 12}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">Konversiya</p>
                    <p className="text-sm font-bold text-emerald-600">
                      {activeTest.variantBConversions ? `${activeTest.variantBConversions}%` : "25%"}
                    </p>
                  </div>
                </div>
                <form action={concludeAbTestAction.bind(null, locale, agentId, activeTest.id, "B")}>
                  <Button type="submit" size="sm" className="w-full text-xs gap-1.5 mt-2">
                    <Trophy className="size-3.5 text-amber-500" />
                    Variant B ni g'olib deb tanlash
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="size-4 text-brand" /> Yangi A/B Test Boshlash
            </CardTitle>
            <CardDescription className="text-xs">
              Mavjud prompt bilan yangi prompt versiyasini solishtiring
            </CardDescription>
          </CardHeader>
          <form action={createAbTestAction.bind(null, locale, agentId)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-name">Test nomi</Label>
                <Input
                  id="test-name"
                  name="name"
                  placeholder="Masalan: Qisqa va tezkor javoblar testi"
                  defaultValue="Yangi Prompt Eksperimenti"
                  required
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Variant A (Hozirgi Tizim Prompti)</Label>
                  <textarea
                    name="variantAPrompt"
                    defaultValue={agent.systemPrompt}
                    rows={6}
                    className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Variant B (Sinab ko'riladigan Yangi Prompt)</Label>
                  <textarea
                    name="variantBPrompt"
                    placeholder="Variant B uchun yangilangan ko'rsatmalarni yozing..."
                    rows={6}
                    className="w-full rounded-md border border-input bg-background p-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>Trafik taqsimoti (% Variant A)</Label>
                <Input type="number" name="trafficSplit" defaultValue={50} min={10} max={90} step={5} />
                <p className="text-[11px] text-muted-foreground">
                  Variant A ga 50%, Variant B ga 50% mijozlar taqsimlanadi
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="gap-2 text-xs">
                <Play className="size-3.5" />
                Eksperimentni ishga tushirish
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {/* Past Experiments History */}
      {pastTests.length > 0 && (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="size-4" /> Yakunlangan Eksperimentlar Tarixi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {pastTests.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString("uz-UZ")} • Status: {t.status}
                    </p>
                  </div>
                  {t.winnerVariant && (
                    <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-none font-semibold">
                      <Trophy className="size-3" /> G'olib: Variant {t.winnerVariant}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
