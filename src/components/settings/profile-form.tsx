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
import { useAuth, useUpdateProfile, useZodForm } from "@/hooks";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/schemas";

/**
 * Name and email.
 *
 * The email field is read-only: changing it in Firebase re-runs the address
 * verification flow and can lock a user out of their own account if the new
 * address is wrong. That belongs with the auth screens, not in a settings form
 * that saves on submit.
 */
export function ProfileForm() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();

  const form = useZodForm({
    schema: updateProfileSchema,
    initialValues: {
      displayName: user?.displayName ?? "",
    } as UpdateProfileInput,
    onSubmit: (values) => updateProfile.mutateAsync(values),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>פרטים אישיים</CardTitle>
        <CardDescription>השם שיוצג לך במערכת.</CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.submit} noValidate className="space-y-4">
          <FormField label="שם מלא" error={form.errors.displayName} required>
            {(field) => (
              <Input
                {...field}
                autoComplete="name"
                maxLength={LIMITS.user.displayNameMax}
                value={form.values.displayName}
                onChange={(event) =>
                  form.setValue("displayName", event.target.value)
                }
              />
            )}
          </FormField>

          <FormField
            label="אימייל"
            hint="לא ניתן לשנות את כתובת האימייל במסך זה."
          >
            {(field) => (
              <Input
                {...field}
                type="email"
                dir="ltr"
                readOnly
                disabled
                value={user?.email ?? ""}
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
              isPending={updateProfile.isPending || form.isSubmitting}
              pendingLabel="שומר…"
            >
              שמירת שינויים
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
