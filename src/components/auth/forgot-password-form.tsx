"use client";

import { MailCheck } from "lucide-react";
import { useState } from "react";

import { FormField, SubmitButton } from "@/components/common";
import { Input } from "@/components/ui/input";
import { isFirebaseConfigured } from "@/config/env";
import { useAuth, useZodForm } from "@/hooks";
import { toHebrewAuthMessage } from "@/lib/errors/messages.he";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/schemas";

/**
 * Password reset request.
 *
 * The success message is shown for **any** submitted address, including ones
 * with no account. Confirming which addresses are registered would hand an
 * attacker a free account-enumeration oracle, and the user experience is
 * identical either way.
 */
export function ForgotPasswordForm() {
  const { sendReset } = useAuth();
  const [isSent, setIsSent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useZodForm({
    schema: forgotPasswordSchema,
    initialValues: { email: "" } as ForgotPasswordInput,
    onSubmit: async (values) => {
      setAuthError(null);

      try {
        await sendReset(values.email);
        setIsSent(true);
      } catch (error) {
        // `auth/user-not-found` is swallowed for the reason above; anything else
        // is a real failure the user needs to know about.
        if (readAuthCode(error) === "auth/user-not-found") {
          setIsSent(true);
          return;
        }
        setAuthError(toHebrewAuthMessage(error));
      }
    },
  });

  if (isSent) {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <MailCheck className="size-6" aria-hidden />
        </span>
        <p className="text-sm">
          אם קיים חשבון עם הכתובת הזו, נשלח אליה קישור לאיפוס סיסמה. בדוק גם את
          תיקיית הספאם.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={form.submit} noValidate className="space-y-4">
      <FormField label="אימייל" error={form.errors.email} required>
        {(field) => (
          <Input
            {...field}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.values.email}
            onChange={(event) => form.setValue("email", event.target.value)}
          />
        )}
      </FormField>

      {authError ? (
        <p role="alert" className="text-sm text-destructive">
          {authError}
        </p>
      ) : null}

      {!isFirebaseConfigured ? (
        <p role="alert" className="text-sm text-warning">
          החיבור ל-Firebase אינו מוגדר, ולכן לא ניתן לשלוח קישור איפוס כרגע.
        </p>
      ) : null}

      <SubmitButton
        variant="strong"
        className="w-full"
        isPending={form.isSubmitting}
        pendingLabel="שולח…"
        disabled={!isFirebaseConfigured}
      >
        שליחת קישור לאיפוס
      </SubmitButton>
    </form>
  );
}

function readAuthCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}
