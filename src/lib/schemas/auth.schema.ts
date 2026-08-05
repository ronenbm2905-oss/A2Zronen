import { z } from "zod";

import { LIMITS } from "@/constants/limits";

import { requiredText } from "./common.schema";

const emailSchema = z
  .string()
  .trim()
  .min(1, "יש להזין כתובת אימייל")
  .pipe(z.email("כתובת האימייל אינה תקינה"))
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(LIMITS.auth.passwordMin, `הסיסמה חייבת להכיל לפחות ${LIMITS.auth.passwordMin} תווים`)
  .max(LIMITS.auth.passwordMax, "הסיסמה ארוכה מדי");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "יש להזין סיסמה"),
});

export const registerSchema = z
  .object({
    displayName: requiredText(LIMITS.user.displayNameMax, "יש להזין שם מלא"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "יש לאשר את הסיסמה"),
  })
  // Attached to `confirmPassword` so the message renders under the right field.
  .refine((value) => value.password === value.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "יש להזין את הסיסמה הנוכחית"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "יש לאשר את הסיסמה החדשה"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "הסיסמה החדשה זהה לסיסמה הנוכחית",
    path: ["newPassword"],
  });

/** The only profile field the user may change. Email changes are out of scope. */
export const updateProfileSchema = z
  .object({
    displayName: requiredText(LIMITS.user.displayNameMax, "יש להזין שם מלא"),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
