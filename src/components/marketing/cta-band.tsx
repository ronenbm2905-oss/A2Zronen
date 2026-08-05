"use client";

import { ArrowLeft } from "lucide-react";

import { ButtonLink } from "@/components/common";
import { useAuth } from "@/hooks";

export function CtaBand() {
  const { status } = useAuth();

  // A signed-in visitor has nothing to convert to, and a second "ללוח הבקרה"
  // band under the identical hero button would just be noise.
  if (status === "authenticated") return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-section sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-2xl bg-brand-navy px-6 py-block text-center text-white">
        <h2 className="text-display-sm text-white">מתחילים לסדר את היום?</h2>
        <p className="max-w-md text-white/80">
          פתח חשבון והתחל לנהל את המשימות שלך תוך פחות מדקה.
        </p>

        <ButtonLink variant="cta" size="lg" href="/register">
          יצירת חשבון
          <ArrowLeft data-icon="inline-end" aria-hidden />
        </ButtonLink>
      </div>
    </section>
  );
}
