import "server-only";

/**
 * The AI agent. Server-only: it holds the OpenAI key and mints Firebase ID
 * tokens on a user's behalf.
 *
 * The agent has **no Firestore access**. Every read and write it performs goes
 * out over HTTP to `/api/v1` carrying that user's ID token, so it inherits
 * `requireUser`, the Zod schemas and the ownership checks rather than
 * re-implementing them. See `api-caller.ts`.
 */

export {
  applyPendingAction,
  runAgentTurn,
  type AgentTurnResult,
  type PendingAction,
} from "./agent";
export { forgetAgentToken, resolveSelfOrigin } from "./api-caller";
