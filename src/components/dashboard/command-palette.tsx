"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Bot,
  Layers,
  Users,
  ShoppingBag,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchGlobal, type SearchResultItem } from "@/lib/search/actions";

function getCategoryIcon(cat: SearchResultItem["category"]) {
  switch (cat) {
    case "agents":
      return <Bot className="size-4 text-blue-500" />;
    case "deals":
      return <Layers className="size-4 text-emerald-500" />;
    case "contacts":
      return <Users className="size-4 text-amber-500" />;
    case "products":
      return <ShoppingBag className="size-4 text-purple-500" />;
    default:
      return <Compass className="size-4 text-brand" />;
  }
}

function getCategoryLabel(cat: SearchResultItem["category"]) {
  switch (cat) {
    case "agents":
      return "AI Xodimlar";
    case "deals":
      return "CRM Bitimlar";
    case "contacts":
      return "Kontaktlar";
    case "products":
      return "Mahsulotlar";
    default:
      return "Sahifalar va Bo'limlar";
  }
}

export function CommandPalette({ locale }: { locale: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isPending, startTransition] = useTransition();

  // Keyboard shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (!query.trim()) {
      // Default to common pages
      startTransition(async () => {
        const defaultResults = await searchGlobal(locale, "a");
        setResults(defaultResults.slice(0, 8));
      });
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchGlobal(locale, query);
        setResults(res);
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [query, locale]);

  const handleSelect = (href: string) => {
    setIsOpen(false);
    setQuery("");
    router.push(href);
  };

  // Group results by category
  const grouped = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, SearchResultItem[]>);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-muted-foreground gap-2 px-2.5 text-xs h-8 rounded-lg border-border hover:border-foreground/20 shadow-2xs font-normal"
        aria-label="Global qidiruv"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:inline">Qidirish...</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 sm:max-w-xl overflow-hidden gap-0 border-border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Global Qidiruv</DialogTitle>
          </DialogHeader>

          <div className="flex items-center px-4 border-b border-border bg-background">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Qidirish... (AI xodim, bitim, kontakt yoki sahifa)"
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-3 py-6 text-sm bg-transparent shadow-none"
              autoFocus
            />
            {isPending && (
              <Sparkles className="size-4 text-brand animate-spin shrink-0" />
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-border/50">
            {Object.keys(grouped).length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <Search className="size-8 mx-auto mb-2 opacity-30 stroke-1" />
                <p>Hech narsa topilmadi</p>
                <p className="text-xs text-muted-foreground mt-1">Boshqa so'z bilan qidirib ko'ring</p>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="py-2 first:pt-0 last:pb-0">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {getCategoryLabel(category as SearchResultItem["category"])}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.href)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-sm hover:bg-muted/80 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-1.5 rounded-md bg-muted group-hover:bg-background border shadow-2xs shrink-0">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-xs sm:text-sm truncate">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-4 py-2 bg-muted/30 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Tanlash uchun bosing yoki Enter</span>
            <span>Yopish uchun Esc</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
