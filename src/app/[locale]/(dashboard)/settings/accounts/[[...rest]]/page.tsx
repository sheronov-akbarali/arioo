import { UserProfile, SignOutButton } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("dashboard.userMenu");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <SignOutButton redirectUrl="/sign-in">
          <Button variant="destructive" className="flex items-center gap-2">
            <LogOut className="size-4" />
            {t("signOut")}
          </Button>
        </SignOutButton>
      </div>
      <UserProfile
        path={`/${locale}/settings/accounts`}
        appearance={{
          elements: {
            rootBox: "w-full",
            cardBox: "w-full shadow-none border border-border",
          },
        }}
      />
    </div>
  );
}
