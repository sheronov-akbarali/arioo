import { getTranslations } from "next-intl/server";
import { verifySession } from "@/lib/auth/dal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDUSTRIES } from "@/lib/org/schema";
import { createOrganization } from "./actions";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await verifySession(locale);
  const t = await getTranslations("onboarding");
  const action = createOrganization.bind(null, locale);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <form action={action} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">{t("nameLabel")}</Label>
          <Input id="name" name="name" required minLength={2} maxLength={100} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="industry">{t("industryLabel")}</Label>
          <select id="industry" name="industry" required className="border-input rounded-md border px-3 py-2">
            {INDUSTRIES.map((industry) => (
              <option key={industry} value={industry}>
                {t(`industries.${industry}`)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">{t("submit")}</Button>
      </form>
    </main>
  );
}
