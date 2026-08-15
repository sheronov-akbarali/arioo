"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyAdminPassword } from "@/lib/admin/password";

export async function adminLoginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const locale = formData.get("locale") || "uz";

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    return { error: "Admin login sozlanmagan (ADMIN_EMAIL / ADMIN_PASSWORD_HASH o'rnatilmagan)." };
  }

  if (
    typeof email === "string" &&
    typeof password === "string" &&
    email === adminEmail &&
    verifyAdminPassword(password, adminPasswordHash)
  ) {
    (await cookies()).set("admin_auth", "true", { path: "/", maxAge: 60 * 60 * 24 });
    redirect(`/${locale}/admin`);
  }

  return { error: "Email yoki parol noto'g'ri." };
}
