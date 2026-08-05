"use client";

import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { isAppError } from "@/lib/errors";

/**
 * Minimal form state driven by a Zod schema.
 *
 * The same schema validates here and in the route handler, so a field can never
 * pass client-side and fail server-side for a reason the form did not anticipate.
 *
 * Errors have two sources and both land in the same map:
 * - local Zod failures on submit, via `z.flattenError`;
 * - server `VALIDATION_ERROR` responses, whose `details` is the server's own
 *   `flattenError(...).fieldErrors` — which is why `submit` unpacks `AppError`.
 *
 * Fields clear their error as soon as they are edited, so a form does not keep
 * scolding the user about something they are already fixing.
 *
 * The generics are written as `<TValues, TOutput>` rather than `<TSchema>` so
 * `TValues` is known to be an object: the state updates spread it, and a bare
 * `z.ZodType` infers `input` as `unknown`, which is not spreadable.
 */

export type FieldErrors<TValues> = Partial<Record<keyof TValues & string, string>>;

interface UseZodFormOptions<TValues extends Record<string, unknown>, TOutput> {
  schema: z.ZodType<TOutput, TValues>;
  initialValues: TValues;
  onSubmit: (values: TOutput) => Promise<unknown> | unknown;
}

export function useZodForm<TValues extends Record<string, unknown>, TOutput>({
  schema,
  initialValues,
  onSubmit,
}: UseZodFormOptions<TValues, TOutput>) {
  const [values, setValues] = useState<TValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<TValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback(
    <K extends keyof TValues & string>(field: K, value: TValues[K]) => {
      setValues((current) => ({ ...current, [field]: value }));
      setErrors((current) => {
        if (!(field in current)) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
      setFormError(null);
    },
    [],
  );

  const reset = useCallback(
    (next?: TValues) => {
      setValues(next ?? initialValues);
      setErrors({});
      setFormError(null);
    },
    [initialValues],
  );

  const toFieldErrors = useCallback((source: unknown): FieldErrors<TValues> => {
    if (typeof source !== "object" || source === null) return {};

    const mapped: FieldErrors<TValues> = {};
    for (const [field, messages] of Object.entries(source)) {
      if (Array.isArray(messages) && typeof messages[0] === "string") {
        mapped[field as keyof TValues & string] = messages[0];
      }
    }

    return mapped;
  }, []);

  const submit = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();

      const result = schema.safeParse(values);

      if (!result.success) {
        const flattened = z.flattenError(result.error);

        setErrors(toFieldErrors(flattened.fieldErrors));
        // A `.refine()` on the object itself produces an error with no field to
        // attach to — surface it rather than failing silently.
        setFormError(flattened.formErrors[0] ?? null);
        return;
      }

      setIsSubmitting(true);
      setFormError(null);

      try {
        await onSubmit(result.data);
      } catch (error) {
        // A server-side validation failure carries the same field-map shape, so
        // it renders under the same inputs as a local one.
        const fromServer = isAppError(error) ? toFieldErrors(error.details) : {};

        if (Object.keys(fromServer).length > 0) {
          setErrors(fromServer);
        } else {
          // Re-thrown so the caller's mutation `onError` still fires its toast.
          throw error;
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, schema, toFieldErrors, values],
  );

  return useMemo(
    () => ({
      values,
      errors,
      formError,
      isSubmitting,
      setValue,
      setValues,
      setErrors,
      setFormError,
      reset,
      submit,
    }),
    [errors, formError, isSubmitting, reset, setValue, submit, values],
  );
}
