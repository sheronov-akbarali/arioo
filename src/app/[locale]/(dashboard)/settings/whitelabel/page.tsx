import { requireOrganization } from "@/lib/auth/dal";
import {
  Palette,
  Sparkles,
  Save,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { saveWhitelabelAction } from "./actions";

export default async function SettingsWhitelabelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { organization } = await requireOrganization(locale);

  let whitelabelData = {
    appName: organization.name || "Arioo",
    logoUrl: "",
    primaryColor: "#0284c7",
    customDomain: "",
  };

  if (organization.whitelabel) {
    try {
      whitelabelData = { ...whitelabelData, ...JSON.parse(organization.whitelabel) };
    } catch {
      // ignore
    }
  }

  const isEnterprise = organization.plan === "enterprise" || organization.plan === "pro";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Palette className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold">White-label va Agentlik Brendingi</h1>
            <p className="text-sm text-muted-foreground">
              Arioo platformasini o'z logotipingiz, ranglaringiz va shaxsiy domeningiz ostida taqdim eting
            </p>
          </div>
        </div>
      </div>

      {!isEnterprise && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-5 text-amber-600 shrink-0" />
            <p className="text-xs sm:text-sm">
              White-label funksiyasi faqat <strong>PRO</strong> va <strong>ENTERPRISE</strong> tariflarida to'liq faollashadi.
            </p>
          </div>
          <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300 font-bold shrink-0">
            PRO / ENTERPRISE
          </Badge>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Settings Form */}
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle className="text-base">Brending Konfiguratsiyasi</CardTitle>
            <CardDescription className="text-xs">
              Mijozlaringiz ko'radigan dastur nomi, logotip va uslub rangini o'rnating
            </CardDescription>
          </CardHeader>
          <form action={saveWhitelabelAction.bind(null, locale)}>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="appName">Dastur / Agentlik Nomi</Label>
                <Input
                  id="appName"
                  name="appName"
                  defaultValue={whitelabelData.appName}
                  placeholder="Masalan: Apex AI Solutions"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Login sahifasi va boshqaruv panelida ko'rsatiladigan nom
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logotip URL Manzili</Label>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  defaultValue={whitelabelData.logoUrl}
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-[11px] text-muted-foreground">
                  PNG yoki SVG formatdagi shaffof fonli logotip
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primaryColor">Asosiy Accent Rangi (HEX)</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    defaultValue={whitelabelData.primaryColor}
                    className="size-9 rounded-md border border-input cursor-pointer p-0.5 bg-background"
                    onChange={(e) => {
                      const input = document.getElementById("primaryColorText") as HTMLInputElement;
                      if (input) input.value = e.target.value;
                    }}
                  />
                  <Input
                    id="primaryColorText"
                    name="primaryColor"
                    defaultValue={whitelabelData.primaryColor}
                    className="font-mono text-xs max-w-xs"
                    placeholder="#0284c7"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="customDomain">Shaxsiy Domen (Custom CNAME)</Label>
                <Input
                  id="customDomain"
                  name="customDomain"
                  defaultValue={whitelabelData.customDomain || ""}
                  placeholder="ai.kompaniya.uz"
                />
                <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground space-y-1 mt-1">
                  <p className="font-semibold text-foreground">DNS Sozlamasi:</p>
                  <p>Domen provayderingizda (Reg.uz, Cloudflare va h.k.) quyidagi CNAME yozuvini qo'shing:</p>
                  <p className="font-mono text-[11px] bg-background p-1.5 rounded border">
                    CNAME • ai.kompaniya.uz ➜ cname.arioo.uz
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4">
              <Button type="submit" className="gap-2 text-xs">
                <Save className="size-3.5" />
                Brendingni saqlash
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Live Preview Card */}
        <div>
          <Card className="sticky top-20 shadow-xs border-brand/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="size-4 text-brand" /> Jonli Ko'rinish (Preview)
              </CardTitle>
              <CardDescription className="text-xs">
                Mijozingiz platformani quyidagicha ko'radi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl border bg-background shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: whitelabelData.primaryColor }}
                    >
                      {whitelabelData.appName.slice(0, 1)}
                    </span>
                    <span className="text-xs font-bold">{whitelabelData.appName}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px]">
                    v2.0
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div
                    className="p-2.5 rounded-lg text-xs text-white font-medium flex items-center justify-between"
                    style={{ backgroundColor: whitelabelData.primaryColor }}
                  >
                    <span>Yangi virtual assistent</span>
                    <CheckCircle2 className="size-3.5" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Powered by your custom enterprise AI infrastructure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
