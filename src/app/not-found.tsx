import Link from "next/link";

/** 404 boundary. Unstyled beyond basic layout — product design comes later. */
export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-lg font-medium">404 — Page not found</h1>
      <Link href="/" className="text-sm underline underline-offset-4">
        Back to start
      </Link>
    </main>
  );
}
