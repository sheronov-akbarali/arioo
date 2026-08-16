"use client";

import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  MessageSquare,
  Briefcase,
  Wallet,
  Sparkles,
  ArrowUpRight,
  Send,
  CheckCircle2,
  TrendingUp,
  UserCheck,
  Zap,
} from "lucide-react";

export type TmaData = {
  organizationName: string;
  creditBalance: number;
  bonusBalance: number;
  activeAgentsCount: number;
  totalDealsCount: number;
  totalConversationsCount: number;
  deals: Array<{
    id: string;
    title: string;
    value: string | null;
    currency: string;
    status: string;
    contactName: string | null;
    createdAt: string;
  }>;
  recentConversations: Array<{
    id: string;
    agentName: string;
    channel: string;
    sentiment: string;
    lastMessage: string;
    timestamp: string;
  }>;
  locale: string;
};

export function TmaContainer({ data }: { data: TmaData }) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "chats" | "crm" | "billing">("dashboard");
  const [dealList, setDealList] = useState(data.deals);

  useEffect(() => {
    // Initialize Telegram WebApp SDK if available
    if (typeof window !== "undefined" && (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } }).Telegram?.WebApp) {
      const tg = (window as unknown as { Telegram: { WebApp: { ready: () => void; expand: () => void; HapticFeedback?: { impactOccurred: (style: string) => void } } } }).Telegram.WebApp;
      tg.ready();
      tg.expand();
    }
  }, []);

  const triggerHaptic = (style: "light" | "medium" | "heavy" = "light") => {
    if (typeof window !== "undefined" && (window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: { impactOccurred: (s: string) => void } } } }).Telegram?.WebApp?.HapticFeedback) {
      (window as unknown as { Telegram: { WebApp: { HapticFeedback: { impactOccurred: (s: string) => void } } } }).Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const handleTabChange = (tab: "dashboard" | "chats" | "crm" | "billing") => {
    triggerHaptic("light");
    setActiveTab(tab);
  };

  const handleUpdateDealStatus = (dealId: string, newStatus: string) => {
    triggerHaptic("medium");
    setDealList((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
    );
  };

  const formatMoney = (val: number | string | null) => {
    if (!val) return "0";
    return new Intl.NumberFormat("uz-UZ").format(Number(val));
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 pb-20 select-none font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-sm">
            A
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-white">
                {data.organizationName}
              </span>
              <span className="text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                TMA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Arioo AI Boshqaruv</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/60 px-2.5 py-1 rounded-full text-xs">
          <Wallet className="size-3.5 text-blue-400" />
          <span className="font-semibold text-white">
            {formatMoney(data.creditBalance)}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">so'm</span>
        </div>
      </header>

      {/* Tab Contents */}
      <main className="flex-1 p-4">
        {/* 1. DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">AI Xodimlar</span>
                  <div className="size-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Sparkles className="size-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-white">
                  {data.activeAgentsCount} ta
                </div>
                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                  <Zap className="size-2.5" /> 24/7 faol
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/80 border border-slate-800 shadow-sm">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-medium">CRM Lidlar</span>
                  <div className="size-6 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                    <TrendingUp className="size-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-white">
                  {data.totalDealsCount} ta
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Savdo voronkasi
                </span>
              </div>
            </div>

            {/* AI Status Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/60 to-indigo-950/40 border border-blue-900/40 relative overflow-hidden">
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-sm text-blue-200">
                    Sun'iy Intellekt Holati
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-[240px]">
                    Telegram, WhatsApp va veb-sayt kanallaridagi muloqotlar avtomatik boshqarilmoqda.
                  </p>
                </div>
                <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse mt-1" />
              </div>
            </div>

            {/* Recent Leads */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  So'nggi Lidlar
                </h2>
                <button
                  onClick={() => handleTabChange("crm")}
                  className="text-xs text-blue-400 font-medium flex items-center gap-0.5"
                >
                  Barchasi <ArrowUpRight className="size-3" />
                </button>
              </div>

              {dealList.slice(0, 3).map((deal) => (
                <div
                  key={deal.id}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-xs text-white">{deal.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {deal.contactName || "Yangi mijoz"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-400">
                      {formatMoney(deal.value)} {deal.currency}
                    </p>
                    <span
                      className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        deal.status === "won"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : deal.status === "negotiating"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {deal.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => handleTabChange("chats")}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-white flex items-center justify-center gap-2 transition"
              >
                <MessageSquare className="size-3.5 text-blue-400" />
                Chatlarni ochish
              </button>
              <button
                onClick={() => handleTabChange("billing")}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-medium text-white flex items-center justify-center gap-2 transition shadow-lg shadow-blue-600/20"
              >
                <Wallet className="size-3.5" />
                Hisobni to'ldirish
              </button>
            </div>
          </div>
        )}

        {/* 2. CHATS TAB */}
        {activeTab === "chats" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm font-semibold text-white">Jonli Muloqotlar</h2>
              <span className="text-[11px] text-slate-400">
                {data.recentConversations.length} ta suhbat
              </span>
            </div>

            {data.recentConversations.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Hozircha suhbatlar mavjud emas
              </div>
            ) : (
              data.recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800/90 space-y-2 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-slate-800 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {conv.agentName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">
                          {conv.agentName}
                        </p>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                          {conv.channel}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        conv.sentiment === "positive"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : conv.sentiment === "negative"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {conv.sentiment === "positive"
                        ? "😊 Ijobiy"
                        : conv.sentiment === "negative"
                          ? "😡 Norozi"
                          : "😐 Neytral"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    {conv.lastMessage || "Xabar mavjud emas"}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>{conv.timestamp}</span>
                    <span className="text-blue-400 font-medium flex items-center gap-1">
                      <UserCheck className="size-3" /> AI Boshqaruvida
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* 3. CRM TAB */}
        {activeTab === "crm" && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1">
              <h2 className="text-sm font-semibold text-white">CRM Bitimlar</h2>
              <span className="text-[11px] text-slate-400">
                Jami: {dealList.length} ta
              </span>
            </div>

            <div className="space-y-2.5">
              {dealList.map((deal) => (
                <div
                  key={deal.id}
                  className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {deal.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Mijoz: {deal.contactName || "Anonim mijoz"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">
                        {formatMoney(deal.value)} {deal.currency}
                      </p>
                      <p className="text-[10px] text-slate-500">{deal.createdAt}</p>
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {["new", "negotiating", "won", "lost"].map((st) => (
                      <button
                        key={st}
                        onClick={() => handleUpdateDealStatus(deal.id, st)}
                        className={`py-1 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition ${
                          deal.status === st
                            ? st === "won"
                              ? "bg-emerald-600 text-white"
                              : st === "lost"
                                ? "bg-red-600 text-white"
                                : "bg-blue-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-750"
                        }`}
                      >
                        {st === "new"
                          ? "Yangi"
                          : st === "negotiating"
                            ? "Muzokara"
                            : st === "won"
                              ? "Yutuq"
                              : "Bekor"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. BILLING TAB */}
        {activeTab === "billing" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-900/60 to-indigo-900/40 border border-blue-800/40 text-center space-y-1">
              <span className="text-xs text-blue-300 font-medium">
                Qoldiq Balans
              </span>
              <div className="text-2xl font-black text-white">
                {formatMoney(data.creditBalance)} so'm
              </div>
              {data.bonusBalance > 0 && (
                <p className="text-[11px] text-emerald-400">
                  + {formatMoney(data.bonusBalance)} so'm keshbek bonusi
                </p>
              )}
            </div>

            {/* Quick Topup Packages */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Hisobni To'ldirish Paketlari
              </h3>

              {[
                { amount: 100000, label: "100 000 so'm", bonus: "+5% bonus" },
                { amount: 300000, label: "300 000 so'm", bonus: "+10% bonus" },
                { amount: 500000, label: "500 000 so'm", bonus: "+15% bonus" },
              ].map((pkg) => (
                <div
                  key={pkg.amount}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{pkg.label}</p>
                    <span className="text-[10px] text-emerald-400 font-medium">
                      {pkg.bonus}
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    <a
                      href={`https://my.click.uz/services/pay?service_id=33445&merchant_id=22110&amount=${pkg.amount}&transaction_param=tma_topup`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      Click
                    </a>
                    <a
                      href={`https://checkout.paycom.uz/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition"
                    >
                      Payme
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 px-3 py-2">
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => handleTabChange("dashboard")}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition ${
              activeTab === "dashboard"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="size-5" />
            <span className="text-[10px]">Asosiy</span>
          </button>

          <button
            onClick={() => handleTabChange("chats")}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition ${
              activeTab === "chats"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="size-5" />
            <span className="text-[10px]">Chatlar</span>
          </button>

          <button
            onClick={() => handleTabChange("crm")}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition ${
              activeTab === "crm"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Briefcase className="size-5" />
            <span className="text-[10px]">CRM</span>
          </button>

          <button
            onClick={() => handleTabChange("billing")}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition ${
              activeTab === "billing"
                ? "text-blue-400 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Wallet className="size-5" />
            <span className="text-[10px]">Balans</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
