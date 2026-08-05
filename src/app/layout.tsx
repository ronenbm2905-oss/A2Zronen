import type { Metadata } from "next";
import { Fredoka, Rubik } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";

import "./globals.css";

/**
 * Brand typefaces. Both ship a genuine Hebrew subset, so the Hebrew UI renders
 * in the brand faces rather than falling back to a system font.
 *
 * Rubik handles body copy and dense UI; Fredoka carries headings and buttons.
 */
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // The template appends the product name to every page's own title, so each
  // route only declares the part that is specific to it.
  title: {
    default: "A2Z Tasks — ניהול משימות פשוט ומסודר",
    template: "%s · A2Z Tasks",
  },
  description:
    "מערכת לניהול משימות, פרויקטים ותגיות. כל המשימות שלך במקום אחד, בעברית ומותאם לנייד.",
  applicationName: "A2Z Tasks",
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${rubik.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
