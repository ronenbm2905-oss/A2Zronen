"use client";

import { FormField, SubmitButton } from "@/components/common";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LIMITS } from "@/constants";
import { useChangePassword, useZodForm } from "@/hooks";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/schemas";

/**
 * Password change.
 *
 * This is the one write in the app that does not go through `/api/v1`. Firebase
 * requires `reauthenticateWithCredential` with the user's live credential, which
 * exists only in the browser — there is no server-side way to verify a current
 * password. It touches Firebase Auth rather than Firestore, so the API-first
 * boundary around tenant data is unaffected.
 */
export function ChangePasswordForm() {
  const changePassword = useChangePassword();

  const form = useZodForm({
    schema: changePasswordSchema,
    initialValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    } as ChangePasswordInput,
    onSubmit: async (values) => {
      await changePassword.mutateAsync(values);
      // Clear the fields so the new password is not left sitting in the DOM.
      form.reset();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>שינוי סיסמה</CardTitle>
        <CardDescription>
          מטעמי אבטחה יש להזין את הסיסמה הנוכחית לפני החלפתה.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.submit} noValidate className="space-y-4">
          <FormField
            label="סיסמה נוכחית"
            error={form.errors.currentPassword}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="password"
                dir="ltr"
                autoComplete="current-password"
                value={form.values.currentPassword}
                onChange={(event) =>
                  form.setValue("currentPassword", event.target.value)
                }
              />
            )}
          </FormField>

          <FormField
            label="סיסמה חדשה"
            error={form.errors.newPassword}
            hint={`לפחות ${LIMITS.auth.passwordMin} תווים`}
            required
          >
            {(field) => (
              <Input
                {...field}
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={form.values.newPassword}
                onChange={(event) =>
                  form.setValue("newPassword", event.target.value)
                }
              />
            )}
          </FormField>

          <FormField
            label="אישור סיסמה חדשה"
            error={form.errors.confirmPassword}
            required
          >
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

          {form.formError ? (
            <p role="alert" className="text-sm text-destructive">
              {form.formError}
            </p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton
              variant="strong"
              isPending={changePassword.isPending || form.isSubmitting}
              pendingLabel="מעדכן…"
            >
              עדכון סיסמה
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
