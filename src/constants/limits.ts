/**
 * Field limits, shared by the Zod schemas and the UI (`maxLength`, character
 * counters). Defined once so a form can never accept input the API will reject.
 */
export const LIMITS = {
  task: {
    titleMax: 200,
    descriptionMax: 5_000,
    tagIdsMax: 20,
  },
  project: {
    nameMax: 80,
    descriptionMax: 500,
  },
  tag: {
    nameMax: 40,
  },
  user: {
    displayNameMax: 80,
  },
  auth: {
    /** Firebase's own minimum; enforcing it client-side gives a Hebrew message. */
    passwordMin: 6,
    passwordMax: 128,
  },
  /** Guard rail on the single realtime subscription — see D1 in the plan. */
  subscriptionMax: 1_000,
} as const;
