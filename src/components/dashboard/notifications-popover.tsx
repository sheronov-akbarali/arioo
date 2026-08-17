"use client";

import { useState, useEffect, useTransition } from "react";
import { Bell, CheckCheck, MessageSquare, UserPlus, CheckCircle, Ticket, Info, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationItem,
} from "@/lib/notifications/actions";
import { useRouter } from "next/navigation";

function getNotificationIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "chat":
      return <MessageSquare className="size-4 text-blue-500" />;
    case "lead":
      return <UserPlus className="size-4 text-emerald-500" />;
    case "approval":
      return <CheckCircle className="size-4 text-amber-500" />;
    case "ticket":
      return <Ticket className="size-4 text-purple-500" />;
    default:
      return <Info className="size-4 text-brand" />;
  }
}

export function NotificationsPopover({ locale }: { locale: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // Guards against overlapping polls: on a slow/flaky connection a
    // getNotifications() call can take longer than the 15s interval,
    // which would otherwise pile up concurrent requests and starve real
    // user actions (form submits) hitting the same server.
    let inFlight = false;

    const fetchItems = () => {
      if (inFlight) return;
      inFlight = true;
      startTransition(async () => {
        try {
          const data = await getNotifications(locale);
          setItems(data);
        } finally {
          inFlight = false;
        }
      });
    };

    fetchItems();
    const interval = setInterval(fetchItems, 15000); // Polling every 15s
    return () => clearInterval(interval);
  }, [locale]);

  const unreadCount = items.filter((i) => !i.isRead).length;

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsAsRead(locale);
      setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
    });
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.isRead) {
      startTransition(async () => {
        await markNotificationAsRead(locale, item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
      });
    }
    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative size-8 rounded-lg"
            aria-label="Bildirishnomalar"
          />
        }
      >
        <Bell className="size-4 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-base font-semibold">Bildirishnomalar</SheetTitle>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} yangi
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAll}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <CheckCheck className="size-3.5 mr-1" />
              Barchasini o'qish
            </Button>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-muted-foreground">
              <Bell className="size-10 stroke-1 mb-2 opacity-30" />
              <p className="text-sm font-medium">Hozircha bildirishnomalar yo'q</p>
              <p className="text-xs mt-1">Yangi suhbatlar yoki voqealar haqida bu yerda xabar beriladi</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 transition-colors cursor-pointer flex gap-3 items-start ${
                  !item.isRead ? "bg-brand/5 hover:bg-brand/10" : "hover:bg-muted/50"
                }`}
              >
                <div className="p-2 rounded-lg bg-background border shadow-xs shrink-0 mt-0.5">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-semibold truncate ${!item.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                      {item.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {item.body}
                  </p>
                  {item.link && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-brand font-medium mt-1">
                      O'tish <ExternalLink className="size-2.5" />
                    </span>
                  )}
                </div>
                {!item.isRead && (
                  <span className="size-2 rounded-full bg-brand shrink-0 mt-1.5" />
                )}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
