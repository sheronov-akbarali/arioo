"use client";

import { useActionState } from "react";
import { adminLoginAction } from "@/app/[locale]/(admin)/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity } from "lucide-react";

const initialState = { error: "" };

export function AdminLoginForm({ locale }: { locale: string }) {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600 mb-2">
          <Activity className="size-6" />
        </div>
        <CardTitle>
          <h2 className="text-2xl font-bold">Arioo Admin Panel</h2>
        </CardTitle>
        <CardDescription>
          Tizim boshqaruviga kirish uchun ma'lumotlarni kiriting
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              name="email" 
              type="email" 
              placeholder="admin@arioo.uz" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Parol</Label>
            <Input 
              id="password" 
              name="password" 
              type="password" 
              placeholder="••••••••" 
              required 
            />
          </div>

          {state?.error && (
            <div className="text-sm font-medium text-red-500 text-center bg-red-50 p-2 rounded-md">
              {state.error}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "Tekshirilmoqda..." : "Kirish"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
