"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PlaygroundChat({
  agentId,
  conversationId,
}: {
  agentId: string;
  conversationId: string;
}) {
  const t = useTranslations("assistants.chat");
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/agents/${agentId}/chat`,
      body: { conversationId },
    }),
    onFinish: () => {
      setError(null);
      router.refresh();
    },
    onError: () => setError(t("error")),
  });

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-destructive text-sm">{error}</p>}
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div key={message.id} className="whitespace-pre-wrap">
            <span className="font-medium">
              {message.role === "user" ? t("you") : t("assistant")}:{" "}
            </span>
            {message.parts.map((part, i) =>
              part.type === "text" ? <span key={`${message.id}-${i}`}>{part.text}</span> : null,
            )}
          </div>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim()) return;
          sendMessage({ text: input });
          setInput("");
        }}
        className="flex gap-2"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.currentTarget.value)}
          placeholder={t("placeholder")}
        />
        <Button type="submit" disabled={status === "streaming"}>
          {t("send")}
        </Button>
      </form>
    </div>
  );
}
