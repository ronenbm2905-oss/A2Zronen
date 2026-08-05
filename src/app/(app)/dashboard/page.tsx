import type { Metadata } from "next";

import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = {
  title: "לוח בקרה",
  description: "תמונת מצב של המשימות, הפרויקטים והתגיות שלך.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
