import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Tizim Sozlamalari va Muhit O'zgaruvchilari (ENV)</h2>
        <p className="text-muted-foreground mt-2">
          Platformani boshqarish uchun barcha global konfiguratsiyalar shu yerda o'rnatiladi.
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sun'iy Intellekt (AI) API Kalitlari</CardTitle>
            <CardDescription>
              OpenAI, Anthropic yoki boshqa modellarga ulanish uchun kalitlarni shu yerdan tahrirlashingiz mumkin.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OPENAI_API_KEY</Label>
              <Input id="openai-key" type="password" defaultValue="sk-proj-**********************************" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="anthropic-key">ANTHROPIC_API_KEY</Label>
              <Input id="anthropic-key" type="password" defaultValue="sk-ant-**********************************" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Saqlash</Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>To'lov Tizimlari</CardTitle>
            <CardDescription>Payme, Click va Stripe integratsiyasi ma'lumotlari.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payme-key">PAYME_MERCHANT_KEY</Label>
              <Input id="payme-key" type="password" defaultValue="************************" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="click-key">CLICK_SECRET_KEY</Label>
              <Input id="click-key" type="password" defaultValue="************************" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Saqlash</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
