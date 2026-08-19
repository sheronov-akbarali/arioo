"use client";

import { useEffect } from "react";

export function ScrollToMessage({ targetId }: { targetId: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [targetId]);

  return null;
}
