"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "@/i18n/navigation";

type TelegramAuthData = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

declare global {
  interface Window {
    onTelegramAuth?: (data: TelegramAuthData) => void;
  }
}

export function TelegramLoginWidget({ botUsername }: { botUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    window.onTelegramAuth = async (data) => {
      const response = await fetch("/api/auth/telegram/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (response.ok) {
        router.push("/dashboard");
      } else {
        router.push("/sign-in?error=oauth_failed");
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    containerRef.current?.appendChild(script);

    return () => {
      window.onTelegramAuth = undefined;
    };
  }, [botUsername, router]);

  return <div ref={containerRef} />;
}
