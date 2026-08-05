"use client";

/**
 * Root error boundary — the last line of defence.
 *
 * It replaces the root layout entirely when a failure happens there, so it
 * renders its own `<html>` and `<body>`. That also means `globals.css` and the
 * brand fonts may not have loaded, which is why everything here is inline
 * styles and system fonts: this screen has to work when nothing else does.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="he" dir="rtl">
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
            color: "#0e1840",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 500 }}>שגיאת מערכת</h1>
          <p style={{ fontSize: "0.875rem", opacity: 0.7, maxWidth: "28rem" }}>
            אירעה תקלה בטעינת האפליקציה. נסה לרענן את הדף.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", opacity: 0.6, direction: "ltr" }}>
              מזהה תקלה: {error.digest}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              border: "1px solid #e7e7e7",
              borderRadius: "9999px",
              padding: "0.5rem 1.5rem",
              fontSize: "0.875rem",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            נסה שוב
          </button>
        </main>
      </body>
    </html>
  );
}
