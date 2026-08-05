"use client";
import { useEffect } from "react";
import { touchSession } from "@/lib/auth/touch-session";

export function SessionTouch() {
  useEffect(() => {
    touchSession();
  }, []);
  return null;
}
