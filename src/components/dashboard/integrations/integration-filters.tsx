"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { IntegrationCategory } from "@/lib/integrations/providers";
import type { IntegrationStatus } from "@/lib/integrations/status";

const STATUS_PILLS: IntegrationStatus[] = ["active", "need_attention", "verifying", "setup_needed", "archived"];

export function IntegrationFilters({
  statusCounts,
  totalCount,
  selectedStatus,
  onStatusChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  statusCounts: Record<IntegrationStatus, number>;
  totalCount: number;
  selectedStatus: IntegrationStatus | "all";
  onStatusChange: (status: IntegrationStatus | "all") => void;
  categories: IntegrationCategory[];
  selectedCategory: IntegrationCategory | null;
  onCategoryChange: (category: IntegrationCategory | null) => void;
}) {
  const t = useTranslations("integrations");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={selectedStatus === "all" ? "default" : "outline"} onClick={() => onStatusChange("all")}>
          {t("filters.all")} · {totalCount}
        </Button>
        {STATUS_PILLS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={selectedStatus === status ? "default" : "outline"}
            onClick={() => onStatusChange(status)}
          >
            {t(`statusDashboard.labels.${status}`)} {statusCounts[status]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!selectedCategory ? "default" : "outline"} onClick={() => onCategoryChange(null)}>
          {t("categoryFilters.all")}
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={selectedCategory === cat ? "default" : "outline"}
            onClick={() => onCategoryChange(cat)}
          >
            {t(`categories.${cat}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
