import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard, RegisterForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "הרשמה",
  description: "יצירת חשבון חדש ב-A2Z Tasks.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="יצירת חשבון"
      description="כמה פרטים ואפשר להתחיל לנהל משימות."
      footer={
        <>
          כבר יש לך חשבון?{" "}
          <Link href="/login" className="text-primary-strong underline underline-offset-4">
            התחברות
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
