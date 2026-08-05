"use client";

/**
 * Root error boundary — the last line of defence.
 *
 * It replaces the root layout entirely when a failure happens there, so it must
 * render its own <html> and <body>.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.125rem", fontWeight: 500 }}>
            Application error
          </h1>
          {error.digest ? (
            <p style={{ fontSize: "0.875rem", opacity: 0.7 }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
