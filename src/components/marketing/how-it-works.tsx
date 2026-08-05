const STEPS = [
  {
    title: "נרשמים",
    description: "חשבון חדש נפתח בכמה שניות, ומחכה לך פרויקט ותגיות להתחלה.",
  },
  {
    title: "מוסיפים משימות",
    description: "כותרת אחת מספיקה. תאריך יעד, פרויקט ותגיות אפשר להוסיף מתי שנוח.",
  },
  {
    title: "עוקבים ומסיימים",
    description: "לוח הבקרה מראה מה דחוף היום, ומה כבר אפשר לסמן כהושלם.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-section sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-display-sm sm:text-display-md">איך זה עובד</h2>
        </div>

        <ol className="mt-block grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="space-y-2 text-center">
              <span
                aria-hidden
                className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary font-heading text-primary-foreground"
              >
                {index + 1}
              </span>
              <h3 className="font-heading text-base">{step.title}</h3>
              <p className="text-sm leading-body text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
