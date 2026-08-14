import { Loader2 } from "lucide-react";

export default function AdminLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-muted-foreground">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-sm font-medium animate-pulse">Ma'lumotlar yuklanmoqda...</p>
      </div>
    </div>
  );
}
