import type { Metadata } from "next";

import { ProjectsView } from "@/components/projects/projects-view";

export const metadata: Metadata = {
  title: "פרויקטים",
  description: "ניהול הפרויקטים שלך וארגון המשימות לפי תחומים.",
};

export default function ProjectsPage() {
  return <ProjectsView />;
}
