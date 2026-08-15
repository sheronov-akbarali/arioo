import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import Link from "next/link";

function maskEnv(val: string | undefined) {
  if (!val) return null;
  if (val.length <= 4) return "****";
  return val.substring(0, 4) + "*".repeat(val.length - 4);
}

export default function AdminSettingsPage() {
  const envs = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PAYME_MERCHANT_KEY: process.env.PAYME_MERCHANT_KEY,
    CLICK_SECRET_KEY: process.env.CLICK_SECRET_KEY,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">
          Tizim Sozlamalari va Muhit O'zgaruvchilari (ENV)
        </h2>
        <p className="text-muted-foreground mt-2">
          Platformani boshqarish uchun barcha global konfiguratsiyalar shu yerda
          ko'rinadi.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sun'iy Intellekt (AI) API Kalitlari</CardTitle>
            <CardDescription>
              OpenAI, Anthropic yoki boshqa modellarga ulanish kalitlari.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>OPENAI_API_KEY</Label>
                <Badge
                  variant={envs.OPENAI_API_KEY ? "default" : "destructive"}
                >
                  {envs.OPENAI_API_KEY ? "Sozlangan" : "Kiritilmagan"}
                </Badge>
              </div>
              <div className="text-sm font-mono bg-muted p-2 rounded-md">
                {maskEnv(envs.OPENAI_API_KEY) || "Topilmadi"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>ANTHROPIC_API_KEY</Label>
                <Badge
                  variant={envs.ANTHROPIC_API_KEY ? "default" : "destructive"}
                >
                  {envs.ANTHROPIC_API_KEY ? "Sozlangan" : "Kiritilmagan"}
                </Badge>
              </div>
              <div className="text-sm font-mono bg-muted p-2 rounded-md">
                {maskEnv(envs.ANTHROPIC_API_KEY) || "Topilmadi"}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 bg-muted/50 py-4 mt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Muhit o'zgaruvchilari Vercel Dashboard'da yoki .env.local faylida
              boshqariladi.
            </p>
            <Link
              href="https://vercel.com/dashboard"
              target="_blank"
              className="text-sm text-primary hover:underline"
            >
              Vercel Dashboard'ga o'tish
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>To'lov Tizimlari</CardTitle>
            <CardDescription>
              Payme, Click va Stripe integratsiyasi ma'lumotlari.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>PAYME_MERCHANT_KEY</Label>
                <Badge
                  variant={envs.PAYME_MERCHANT_KEY ? "default" : "destructive"}
                >
                  {envs.PAYME_MERCHANT_KEY ? "Sozlangan" : "Kiritilmagan"}
                </Badge>
              </div>
              <div className="text-sm font-mono bg-muted p-2 rounded-md">
                {maskEnv(envs.PAYME_MERCHANT_KEY) || "Topilmadi"}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>CLICK_SECRET_KEY</Label>
                <Badge
                  variant={envs.CLICK_SECRET_KEY ? "default" : "destructive"}
                >
                  {envs.CLICK_SECRET_KEY ? "Sozlangan" : "Kiritilmagan"}
                </Badge>
              </div>
              <div className="text-sm font-mono bg-muted p-2 rounded-md">
                {maskEnv(envs.CLICK_SECRET_KEY) || "Topilmadi"}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 bg-muted/50 py-4 mt-2 border-t">
            <p className="text-sm text-muted-foreground">
              Muhit o'zgaruvchilari Vercel Dashboard'da yoki .env.local faylida
              boshqariladi.
            </p>
            <Link
              href="https://vercel.com/dashboard"
              target="_blank"
              className="text-sm text-primary hover:underline"
            >
              Vercel Dashboard'ga o'tish
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
