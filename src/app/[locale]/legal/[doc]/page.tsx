import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

const VALID_DOCS = ["offer", "privacy", "terms", "cookies", "consent"] as const;
type LegalDoc = (typeof VALID_DOCS)[number];

function isValidDoc(doc: string): doc is LegalDoc {
  return (VALID_DOCS as readonly string[]).includes(doc);
}

type Props = { params: Promise<{ doc: string }> };

export default async function LegalDocPage({ params }: Props) {
  const { doc } = await params;
  if (!isValidDoc(doc)) {
    notFound();
  }

  const t = await getTranslations("legal");

  return (
    <article className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="text-3xl font-bold tracking-tight">{t(`${doc}.title`)}</h1>
      <p className="mt-6 rounded-lg border border-yellow-600/40 bg-yellow-600/10 p-4 text-sm text-yellow-700 dark:text-yellow-400">
        {t("disclaimer")}
      </p>
    </article>
  );
}

export function generateStaticParams() {
  return VALID_DOCS.map((doc) => ({ doc }));
}
