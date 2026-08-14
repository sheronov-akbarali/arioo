"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function adminLoginAction(prevState: any, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const locale = formData.get("locale") || "uz";

  // Qattiq belgilangan (hardcoded) admin ma'lumotlari:
  if (email === "admin@arioo.uz" && password === "admin123") {
    (await cookies()).set("admin_auth", "true", { path: "/", maxAge: 60 * 60 * 24 });
    redirect(`/${locale}/admin`);
  } else {
    return { error: "Email yoki parol noto'g'ri. (Maslahat: admin@arioo.uz / admin123)" };
  }
}
