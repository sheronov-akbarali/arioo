import { cn } from "@/lib/utils";

export function MessageBubble({
  role,
  content,
  label,
}: {
  role: "user" | "assistant" | "system";
  content: string;
  label: string;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      <span className="px-1 text-xs text-muted-foreground">{label}</span>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap",
          isUser
            ? "rounded-br-sm bg-brand text-brand-foreground"
            : role === "system"
              ? "rounded-bl-sm border border-dashed border-border text-muted-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {content}
      </div>
    </div>
  );
}
