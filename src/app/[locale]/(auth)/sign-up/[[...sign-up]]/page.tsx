import { SignUp } from "@clerk/nextjs";

export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-16">
      <SignUp
        path={`/${locale}/sign-up`}
        signInUrl={`/${locale}/sign-in`}
        fallbackRedirectUrl={`/${locale}/dashboard`}
      />
    </main>
  );
}
