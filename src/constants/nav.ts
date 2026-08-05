import {
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  Settings,
  Tags,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The `(app)` sidebar, in display order. */
export const APP_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "לוח בקרה", icon: LayoutDashboard },
  { href: "/tasks", label: "כל המשימות", icon: ListTodo },
  { href: "/projects", label: "פרויקטים", icon: FolderKanban },
  { href: "/tags", label: "תגיות", icon: Tags },
  { href: "/settings", label: "הגדרות", icon: Settings },
];
