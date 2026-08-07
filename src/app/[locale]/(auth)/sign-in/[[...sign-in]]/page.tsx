import { SignIn } from "@clerk/nextjs";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-4 py-16">
      <SignIn
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/sign-up`}
        fallbackRedirectUrl={`/${locale}/dashboard`}
      />
    </main>
  );
}
