"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormField, SubmitButton } from "@/components/common";
import { Input } from "@/components/ui/input";
import { isFirebaseConfigured } from "@/config/env";
import { LIMITS } from "@/constants";
import { useAuth, useZodForm } from "@/hooks";
import { toHebrewAuthMessage } from "@/lib/errors/messages.he";
import { registerSchema, type RegisterInput } from "@/lib/schemas";

/**
 * Registration form.
 *
 * `signUp` creates the account, sets the display name, then calls
 * `POST /api/v1/auth/bootstrap` to seed the profile mirror plus a starter
 * project and tags — so a new user lands on a dashboard with something in it
 * rather than four empty panels.
 */
export function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);

  const form = useZodForm({
    schema: registerSchema,
    initialValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    } as RegisterInput,
    onSubmit: async (values) => {
      setAuthError(null);

      try {
        await signUp(values.email, values.password, values.displayName);
        router.replace("/dashboard");
      } catch (error) {
        setAuthError(toHebrewAuthMessage(error));
      }
    },
  });

  return (
    <form onSubmit={form.submit} noValidate className="space-y-4">
      <FormField label="שם מלא" error={form.errors.displayName} required>
        {(field) => (
          <Input
            {...field}
            autoComplete="name"
            maxLength={LIMITS.user.displayNameMax}
            value={form.values.displayName}
            onChange={(event) => form.setValue("displayName", event.target.value)}
          />
        )}
      </FormField>

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

      <FormField
        label="סיסמה"
        error={form.errors.password}
        hint={`לפחות ${LIMITS.auth.passwordMin} תווים`}
        required
      >
        {(field) => (
          <Input
            {...field}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={form.values.password}
            onChange={(event) => form.setValue("password", event.target.value)}
          />
        )}
      </FormField>

      <FormField label="אישור סיסמה" error={form.errors.confirmPassword} required>
        {(field) => (
          <Input
            {...field}
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={form.values.confirmPassword}
            onChange={(event) =>
              form.setValue("confirmPassword", event.target.value)
            }
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
          החיבור ל-Firebase אינו מוגדר, ולכן לא ניתן להירשם כרגע.
        </p>
      ) : null}

      <SubmitButton
        variant="strong"
        className="w-full"
        isPending={form.isSubmitting}
        pendingLabel="יוצר חשבון…"
        disabled={!isFirebaseConfigured}
      >
        יצירת חשבון
      </SubmitButton>
    </form>
  );
}
