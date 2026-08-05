import type { Metadata } from "next";

import { TagsView } from "@/components/tags/tags-view";

export const metadata: Metadata = {
  title: "תגיות",
  description: "ניהול התגיות שלך וסימון משימות לפי הקשר.",
};

export default function TagsPage() {
  return <TagsView />;
}
