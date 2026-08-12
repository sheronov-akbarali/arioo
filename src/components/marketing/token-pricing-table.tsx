import { useTranslations } from "next-intl";
import {
  TOKEN_PRICING_PROVIDERS,
  TOKEN_PRICING_EMBEDDINGS,
  formatUzsPer1k,
  formatUsdPer1k,
} from "@/lib/token-pricing-data";

export function TokenPricingTable() {
  const t = useTranslations("pricing.tokenTable");

  return (
    <div className="mt-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="mt-10 space-y-10">
        {TOKEN_PRICING_PROVIDERS.map((provider) => (
          <div key={provider.key}>
            <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {provider.name}
            </h3>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("modelColumn")}</th>
                    <th className="px-4 py-2 font-medium">{t("promptColumn")}</th>
                    <th className="px-4 py-2 font-medium">{t("completionColumn")}</th>
                  </tr>
                </thead>
                <tbody>
                  {provider.models.map((model) => (
                    <tr key={model.id} className="border-t border-border">
                      <td className="px-4 py-2">{model.name}</td>
                      <td className="px-4 py-2">
                        {formatUzsPer1k(model.inputPerToken)} UZS
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatUsdPer1k(model.inputPerToken)})
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {formatUzsPer1k(model.outputPerToken)} UZS
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({formatUsdPer1k(model.outputPerToken)})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        <div>
          <h3 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {t("embeddingTitle")}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">{t("modelColumn")}</th>
                  <th className="px-4 py-2 font-medium">{t("priceColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {TOKEN_PRICING_EMBEDDINGS.map((model) => (
                  <tr key={model.id} className="border-t border-border">
                    <td className="px-4 py-2">{model.name}</td>
                    <td className="px-4 py-2">
                      {formatUzsPer1k(model.pricePerToken)} UZS
                      <span className="ml-1 text-xs text-muted-foreground">
                        ({formatUsdPer1k(model.pricePerToken)})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">{t("footnote")}</p>
    </div>
  );
}
