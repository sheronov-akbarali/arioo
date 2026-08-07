import { UserProfile } from "@clerk/nextjs";

export default async function AccountSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex flex-col gap-6">
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
