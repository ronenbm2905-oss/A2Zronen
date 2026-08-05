"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { FormField, SubmitButton } from "@/components/common";
import { Input } from "@/components/ui/input";
import { isFirebaseConfigured } from "@/config/env";
import { useAuth, useZodForm } from "@/hooks";
import { toHebrewAuthMessage } from "@/lib/errors/messages.he";
import { loginSchema, type LoginInput } from "@/lib/schemas";

/**
 * Sign-in form.
 *
 * Firebase Auth errors never pass through `AppError` — sign-in happens directly
 * against the SDK, not through `/api/v1` — so failures are translated by
 * `toHebrewAuthMessage`, which understands codes like `auth/invalid-credential`.
 *
 * Wrong-password and unknown-email both render the same message on purpose: a
 * distinct "no such user" reply would let anyone enumerate registered addresses.
 */
export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useZodForm({
    schema: loginSchema,
    initialValues: { email: "", password: "" } as LoginInput,
    onSubmit: async (values) => {
      setAuthError(null);

      try {
        await signIn(values.email, values.password);

        const next = searchParams.get("next");
        router.replace(next?.startsWith("/") ? next : "/dashboard");
      } catch (error) {
        setAuthError(toHebrewAuthMessage(error));
      }
    },
  });

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

      <FormField label="סיסמה" error={form.errors.password} required>
        {(field) => (
          <Input
            {...field}
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={form.values.password}
            onChange={(event) => form.setValue("password", event.target.value)}
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
          החיבור ל-Firebase אינו מוגדר, ולכן לא ניתן להתחבר כרגע.
        </p>
      ) : null}

      <SubmitButton
        variant="strong"
        className="w-full"
        isPending={form.isSubmitting}
        pendingLabel="מתחבר…"
        disabled={!isFirebaseConfigured}
      >
        התחברות
      </SubmitButton>
    </form>
  );
}
