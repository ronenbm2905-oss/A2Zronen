"use client";

import { PageHeader } from "@/components/common";

import { AccountActions } from "./account-actions";
import { ChangePasswordForm } from "./change-password-form";
import { ProfileForm } from "./profile-form";
import { TelegramIntegration } from "./telegram-integration";

/**
 * User settings: account basics, then integrations.
 *
 * Telegram sits full-width below the two account cards rather than beside them.
 * It is the only section here with a multi-step flow — save a token, then claim
 * the chat — and the setup instructions need the room.
 */
export function SettingsView() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="הגדרות"
        description="ניהול פרטי החשבון והחיבורים שלך."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileForm />
        <ChangePasswordForm />
      </div>

      <TelegramIntegration />

      <AccountActions />
    </div>
  );
}
