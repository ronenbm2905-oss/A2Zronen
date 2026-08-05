import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Modules that must never reach the browser. Importing any of them from a
 * client-side file leaks a secret into the client bundle — the Firebase service
 * account, the OpenAI key, the secret-box key, or a user's Telegram bot token.
 *
 * These modules also carry `import "server-only"`, which turns the same mistake
 * into a build failure. This rule exists because a lint error names the file and
 * the offending import immediately, whereas the `server-only` build error shows
 * up later and reads like a bundler problem.
 */
const SERVER_ONLY_PATTERNS = [
  "@/config/server-env",
  "@/lib/firebase/admin",
  "@/lib/auth",
  "@/lib/auth/*",
  "@/services/server",
  "@/services/server/*",
  "@/lib/ai",
  "@/lib/ai/*",
  "@/lib/telegram",
  "@/lib/telegram/*",
  "@/lib/crypto/*",
  "@/lib/rate-limit",
];

/** Everything below these paths ships to the browser. */
const CLIENT_SIDE_FILES = [
  "src/components/**/*.{ts,tsx}",
  "src/hooks/**/*.{ts,tsx}",
  "src/services/client/**/*.ts",
  "src/lib/api-client/**/*.ts",
  "src/lib/query/**/*.ts",
  "src/lib/schemas/**/*.ts",
  "src/constants/**/*.ts",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: CLIENT_SIDE_FILES,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: SERVER_ONLY_PATTERNS,
              message:
                "Server-only module. It carries the Firebase service account and must never be imported from client-side code. Go through /api/v1 instead.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
