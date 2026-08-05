import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} A2Z Tasks</p>

        <nav className="flex gap-4" aria-label="קישורים בתחתית הדף">
          <Link href="/login" className="hover:text-foreground">
            התחברות
          </Link>
          <Link href="/register" className="hover:text-foreground">
            הרשמה
          </Link>
        </nav>
      </div>
    </footer>
  );
}
