import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "איפוס סיסמה",
  description: "שליחת קישור לאיפוס הסיסמה בחשבון A2Z Tasks.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="איפוס סיסמה"
      description="נשלח אליך קישור לאיפוס הסיסמה בדוא״ל."
      footer={
        <>
          נזכרת בסיסמה?{" "}
          <Link href="/login" className="text-primary-strong underline underline-offset-4">
            חזרה להתחברות
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
