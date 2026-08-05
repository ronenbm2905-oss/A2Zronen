import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "התחברות",
  description: "התחברות לחשבון A2Z Tasks שלך.",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="התחברות"
      description="הזן את פרטי החשבון שלך כדי להמשיך."
      footer={
        <>
          אין לך חשבון עדיין?{" "}
          <Link href="/register" className="text-primary-strong underline underline-offset-4">
            הרשמה
          </Link>
        </>
      }
    >
      <LoginForm />

      <p className="pt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          שכחת סיסמה?
        </Link>
      </p>
    </AuthCard>
  );
}
