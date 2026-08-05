import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "הגדרות",
  description: "ניהול פרטי החשבון, הסיסמה והחיבור ל-Telegram.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
