"use client";

import { ArrowLeft } from "lucide-react";

import { ButtonLink } from "@/components/common";
import { useAuth } from "@/hooks";

export function Hero() {
  const { status } = useAuth();
  const isAuthenticated = status === "authenticated";

  return (
    <section className="bg-gradient-brand text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-section text-center sm:px-6">
        <h1 className="mx-auto max-w-3xl text-display-lg text-white sm:text-display-2xl">
          כל המשימות שלך. במקום אחד.
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-base text-white/85 sm:text-lg">
          נהל משימות, פרויקטים ותגיות בממשק פשוט בעברית — מהמחשב ומהנייד, בזמן
          אמת.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {isAuthenticated ? (
            <ButtonLink variant="cta" size="hero" href="/dashboard">
              ללוח הבקרה
              {/* Arrow points inline-end, which is leftward in Hebrew. */}
              <ArrowLeft data-icon="inline-end" aria-hidden />
            </ButtonLink>
          ) : (
            <>
              <ButtonLink variant="cta" size="hero" href="/register">
                התחלה בחינם
                <ArrowLeft data-icon="inline-end" aria-hidden />
              </ButtonLink>

              <ButtonLink
                variant="outline"
                size="hero"
                className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                href="/login"
              >
                כבר יש לי חשבון
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
