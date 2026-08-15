"use client";

import { useState } from "react";
import { Code2, Copy, Check, Terminal, Play, Sparkles, BookOpen, Layers } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const SNIPPETS = {
  webhook_node: `// Arioo Telegram Webhook Integration in Node.js Express
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/webhook', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.text) return res.sendStatus(200);

  // Send request to Arioo AI Channel API
  const response = await fetch('https://arioo.uz/api/webhooks/telegram/CHANNEL_ID', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body)
  });

  res.sendStatus(200);
});

app.listen(3000, () => console.log('Server running on port 3000'));`,

  webhook_python: `# Arioo AI Webhook Integration in Python FastAPI
from fastapi import FastAPI, Request
import httpx

app = FastAPI()

@app.post("/webhook")
async def handle_webhook(request: Request):
    payload = await request.json()
    
    async with httpx.AsyncClient() as client:
        await client.post(
            "https://arioo.uz/api/webhooks/telegram/CHANNEL_ID",
            json=payload,
            timeout=10.0
        )
    return {"ok": True}`,

  widget_embed: `<!-- Arioo AI Web Widget Embed Script -->
<script 
  src="https://arioo.uz/widget.js" 
  data-agent-id="YOUR_AGENT_ID"
  data-theme="dark"
  data-position="bottom-right"
  async>
</script>`,

  rest_api: `// Call Arioo AI Agent REST API
const res = await fetch('https://arioo.uz/api/agents/YOUR_AGENT_ID/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    conversationId: 'conv_123',
    messages: [
      { role: 'user', content: 'Assalomu alaykum, narxlar haqida ma\\\\'lumot bering' }
    ]
  })
});

const data = await res.json();
console.log(data);`,
};

export default function CodeAgentPage() {
  const [selectedTab, setSelectedTab] = useState("webhook_node");
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateScript = () => {
    if (!customPrompt) return;
    setGenerating(true);
    setTimeout(() => {
      setGeneratedCode(`// Auto-generated Integration Script for: "${customPrompt}"
import { db } from "@/db/client";

export async function processCustomerLead(payload: { name: string; phone: string; note: string }) {
  console.log("Processing lead into Arioo CRM:", payload);
  
  // 1. Forward to Arioo CRM & notify assigned AI agent
  const response = await fetch("https://arioo.uz/api/agents/ai_lead_processor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [{ role: "user", content: \`Yangi lid keldi: \${payload.name}, Tel: \${payload.phone}\` }]
    })
  });
  
  return { success: true, status: "forwarded_to_agent" };
}`);
      setGenerating(false);
    }, 1200);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Code2 className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-semibold">Kod Agenti va Dasturchilar Markazi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Arioo AI platformasini har qanday tizim, vebsayt yoki ilovaga ulash uchun tayyor SDK va kod shablonlari
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Quick Integration Presets */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Tayyor Integratsiya Kodlari</CardTitle>
                  <CardDescription>
                    O'zingizga kerakli texnologiyani tanlang va 1 daqiqada ulaning
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => handleCopy(SNIPPETS[selectedTab as keyof typeof SNIPPETS])}
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  {copied ? "Nusxalandi" : "Nusxa olish"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="webhook_node">Node.js Express</TabsTrigger>
                  <TabsTrigger value="webhook_python">Python FastAPI</TabsTrigger>
                  <TabsTrigger value="widget_embed">Sayt Vidjeti</TabsTrigger>
                  <TabsTrigger value="rest_api">REST API</TabsTrigger>
                </TabsList>

                {Object.entries(SNIPPETS).map(([key, code]) => (
                  <TabsContent key={key} value={key} className="mt-4">
                    <div className="relative rounded-xl bg-zinc-950 p-4 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800 shadow-inner">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="size-3 text-brand" /> snippet.{key.includes("python") ? "py" : key.includes("embed") ? "html" : "js"}
                        </span>
                        <span>UTF-8</span>
                      </div>
                      <pre>
                        <code>{code}</code>
                      </pre>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* AI Custom Script Generator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-brand" /> AI Integratsiya Kod Generatori
              </CardTitle>
              <CardDescription>
                Qanday tizim yoki formatga ulamoqchi ekanligingizni yozing, AI avtomatik kod yozib beradi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Masalan: Tilda formasi kelganida AI orqali Telegram kanalga yuborish..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button
                  onClick={handleGenerateScript}
                  disabled={generating || !customPrompt}
                  className="gap-2"
                >
                  <Play className="size-3.5" />
                  {generating ? "Yozilmoqda..." : "Generatsiya"}
                </Button>
              </div>

              {generatedCode && (
                <div className="relative rounded-xl bg-zinc-950 p-4 text-zinc-100 font-mono text-xs overflow-x-auto border border-zinc-800">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] text-zinc-400">
                    <span className="text-emerald-400">✨ Generated Custom Handler</span>
                    <button
                      onClick={() => handleCopy(generatedCode)}
                      className="hover:text-white"
                    >
                      Nusxalash
                    </button>
                  </div>
                  <pre>
                    <code>{generatedCode}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Documentation Cards */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="size-4 text-brand" /> API Hujjatlari
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg border bg-muted/40">
                <p className="font-semibold text-foreground">Base URL:</p>
                <code className="text-brand">https://arioo.uz/api</code>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/40">
                <p className="font-semibold text-foreground">Autentifikatsiya:</p>
                <p>Bearer Token yoki Webhook ID orqali</p>
              </div>
              <div className="p-2.5 rounded-lg border bg-muted/40">
                <p className="font-semibold text-foreground">Rate Limits:</p>
                <p>120 req / daqiqa (DDoS himoyasi faol)</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-brand" /> Qo'llab-quvvatlanuvchi Platformalar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> Telegram Bot & MTProto API
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> WhatsApp Cloud Graph API v19
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> OLX Partner Webhook
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500" /> WebRTC Audio & SIP Trunks
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
