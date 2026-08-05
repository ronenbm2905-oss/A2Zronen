"use client";

import { useMutation } from "@tanstack/react-query";

import { endpoints } from "@/lib/api-client";
import { toHebrewAuthMessage, toHebrewMessage } from "@/lib/errors/messages.he";
import type { ChangePasswordInput, UpdateProfileInput } from "@/lib/schemas";
import { toast } from "@/lib/toast";
import type { UserProfile } from "@/types";

import { useApiFetch, useAuth } from "./use-auth";

/**
 * Profile mutations for the settings screen.
 *
 * The display name goes through `PATCH /api/v1/me`, which updates Firebase Auth
 * and the `users/{uid}` mirror in one handler. `refreshUser()` then pulls the new
 * name back into the auth context so the topbar updates without a reload.
 */
export function useUpdateProfile() {
  const apiFetch = useApiFetch();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<UserProfile>(endpoints.me(), { method: "PATCH", body: input }),

    onSuccess: async () => {
      await refreshUser();
      toast.success("הפרטים נשמרו.");
    },
    onError: (error) => toast.error(toHebrewMessage(error)),
  });
}

/**
 * Password change — the one write that legitimately bypasses `/api/v1`.
 *
 * Firebase requires `reauthenticateWithCredential` with the user's live
 * credential, which exists only in the browser; there is no server-side
 * equivalent that verifies the current password. It touches Firebase Auth, not
 * Firestore, so the API-first boundary around tenant data is unaffected.
 */
export function useChangePassword() {
  const { changePassword } = useAuth();

  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: ChangePasswordInput) =>
      changePassword(currentPassword, newPassword),

    onSuccess: () => toast.success("הסיסמה עודכנה."),
    onError: (error) => toast.error(toHebrewAuthMessage(error)),
  });
}
