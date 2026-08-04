import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const LEGAL_DOCS = ["offer", "privacy", "terms", "cookies", "consent"] as const;

export function Footer() {
  const t = useTranslations("footer");
  const tLegal = useTranslations("legal");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">TayanchAI</p>
        <p className="mt-1 max-w-md">{t("tagline")}</p>
        <div className="mt-6">
          <p className="mb-2 font-medium text-foreground">{t("legalTitle")}</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_DOCS.map((doc) => (
              <li key={doc}>
                <Link href={`/legal/${doc}`} className="hover:text-foreground">
                  {tLegal(`${doc}.title`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-8 text-xs">{t("copyright")}</p>
      </div>
    </footer>
  );
}
