"use client";

import { useTransition } from "react";
import { ShieldBan, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminToggleUserBanAction, adminDeleteUserAction } from "@/app/[locale]/(admin)/admin/actions";
import { ChangePasswordDialog } from "./change-password-dialog";

export function UserRowActions({
  userId,
  userEmail,
  isBanned,
}: {
  userId: string;
  userEmail: string;
  isBanned: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleToggleBan = () => {
    const actionName = isBanned ? "blokdan chiqarmoqchimisiz" : "bloklamoqchimisiz";
    if (!confirm(`Haqiqatan ham ushbu foydalanuvchini (${userEmail}) ${actionName}?`)) return;

    startTransition(async () => {
      await adminToggleUserBanAction(userId, !isBanned);
    });
  };

  const handleDelete = () => {
    if (!confirm(`DIQQAT: Ushbu foydalanuvchini (${userEmail}) butunlay o'chirib tashlamoqchimisiz?`)) return;

    startTransition(async () => {
      await adminDeleteUserAction(userId);
    });
  };

  return (
    <div className="flex items-center justify-end gap-1.5">
      <ChangePasswordDialog userId={userId} userEmail={userEmail} />

      <Button
        size="sm"
        variant="ghost"
        className={`h-8 w-8 p-0 ${isBanned ? "text-emerald-600 hover:text-emerald-700" : "text-amber-600 hover:text-amber-700"}`}
        disabled={isPending}
        onClick={handleToggleBan}
        title={isBanned ? "Blokdan chiqarish" : "Bloklash"}
      >
        {isBanned ? <ShieldCheck className="size-4" /> : <ShieldBan className="size-4" />}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        disabled={isPending}
        onClick={handleDelete}
        title="O'chirish"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
