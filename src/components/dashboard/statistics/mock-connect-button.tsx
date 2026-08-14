"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

export function MockConnectButton() {
  const [status, setStatus] = useState<"idle" | "loading" | "connected">("idle");

  const handleClick = () => {
    setStatus("loading");
    setTimeout(() => {
      setStatus("connected");
    }, 1500);
  };

  if (status === "connected") {
    return (
      <Button size="sm" variant="outline" className="w-full border-green-500 text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700" onClick={() => setStatus("idle")}>
        <CheckCircle2 className="mr-2 size-4" /> Ulangan
      </Button>
    );
  }

  return (
    <Button 
      size="sm" 
      variant="outline" 
      className="w-full" 
      onClick={handleClick}
      disabled={status === "loading"}
    >
      {status === "loading" ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
      {status === "loading" ? "Ulanmoqda..." : "Ulash"}
    </Button>
  );
}
