import "server-only";

import OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources/chat/completions";

import { serverEnv } from "@/config/server-env";
import { AppError, isAppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { createAgentApiClient } from "./api-caller";
import { buildSystemPrompt } from "./prompt";
import {
  AGENT_TOOLS,
  buildActionPreview,
  describeCompletedAction,
  executeTool,
  MUTATING_TOOLS,
  ToolContext,
} from "./tools";

/**
 * The conversation loop.
 *
 * Its one structural commitment: **a mutating tool call never runs in the same
 * turn that produced it.** When the model asks to create, update or delete, the
 * loop stops, renders a preview from the call's own arguments, and persists the
 * call as a pending action. Only a subsequent explicit "yes" from the user
 * reaches {@link executeTool}. That is why confirmation cannot be prompted away:
 * the model is not the thing that decides to run it.
 *
 * Read-only tools run immediately and feed straight back into the loop, so
 * "what's still open in the marketing project?" resolves in one exchange.
 */

/** Enough hops for search → shape an answer; short enough to bound cost. */
const MAX_ITERATIONS = 5;

/** Turns of plain conversation kept as context. Tool traffic is not persisted. */
const MAX_HISTORY_MESSAGES = 12;

/** A confirmation left hanging goes stale rather than firing hours later. */
const PENDING_ACTION_TTL_MS = 15 * 60 * 1000;

export interface AgentTurnInput {
  uid: string;
  userName: string | null;
  message: string;
  /** Prior turns, as persisted by the caller. */
  history: ChatCompletionMessageParam[];
  /** Origin the agent should call `/api/v1` on. */
  baseUrl: string;
}

export interface PendingAction {
  tool: string;
  args: unknown;
  createdAt: number;
}

export interface AgentTurnResult {
  reply: string;
  /** Set when the reply is a preview awaiting yes/no. */
  pendingAction: PendingAction | null;
  /** History to persist, already trimmed. */
  history: ChatCompletionMessageParam[];
}

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = serverEnv.openai.apiKey;
  if (!apiKey) {
    throw AppError.config("OPENAI_API_KEY is not set; the agent cannot answer.");
  }

  cachedClient = new OpenAI({ apiKey, maxRetries: 2, timeout: 30_000 });
  return cachedClient;
}

/**
 * Keep only clean user/assistant text turns.
 *
 * Tool calls and their results are dropped rather than trimmed. The OpenAI API
 * rejects a `tool` message whose originating `assistant` message is missing, so
 * a naive "keep the last N" would eventually slice a pair in half and fail the
 * *next* request — a bug that only appears once a conversation gets long.
 * Dropping tool traffic wholesale makes that unrepresentable, and costs little:
 * the model re-queries when it needs data, which is also how it stays current.
 */
function trimHistory(
  messages: ChatCompletionMessageParam[],
): ChatCompletionMessageParam[] {
  const conversational = messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.length > 0 &&
      !("tool_calls" in message && message.tool_calls),
  );

  return conversational.slice(-MAX_HISTORY_MESSAGES);
}

function readToolArguments(call: ChatCompletionMessageToolCall): unknown {
  if (call.type !== "function") return {};

  try {
    return JSON.parse(call.function.arguments || "{}");
  } catch {
    // A model that emits malformed JSON gets told so and can retry; throwing
    // here would fail the whole turn over a recoverable slip.
    return null;
  }
}

/** Tool failures are reported *to the model*, so it can explain or adjust. */
function toToolErrorPayload(error: unknown): string {
  if (isAppError(error)) {
    return JSON.stringify({ error: error.code, message: error.message });
  }

  logger.error("Agent tool failed unexpectedly", { error });
  return JSON.stringify({ error: "INTERNAL_ERROR", message: "הפעולה נכשלה." });
}

export async function runAgentTurn(
  input: AgentTurnInput,
): Promise<AgentTurnResult> {
  const client = getClient();
  const api = createAgentApiClient(input.uid, input.baseUrl);
  const context = new ToolContext(api);

  const history = trimHistory(input.history);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(input.userName) },
    ...history,
    { role: "user", content: input.message },
  ];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration += 1) {
    const completion = await client.chat.completions.create({
      model: serverEnv.openai.model,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
      temperature: 0.2,
      max_completion_tokens: 700,
    });

    const choice = completion.choices[0]?.message;
    if (!choice) break;

    const toolCalls = choice.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const reply = choice.content?.trim() || "";

      return {
        reply: reply || "לא הצלחתי לנסח תשובה. נסה לנסח את הבקשה אחרת.",
        pendingAction: null,
        history: trimHistory([
          ...history,
          { role: "user", content: input.message },
          { role: "assistant", content: reply },
        ]),
      };
    }

    messages.push(choice);

    // A model can request several tools at once. Read-only ones are answered in
    // place; the first mutating one ends the turn. Every call still gets a
    // `tool` reply — the API rejects the next request otherwise.
    let pending: PendingAction | null = null;
    let preview = "";

    for (const call of toolCalls) {
      if (call.type !== "function") {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({ error: "UNSUPPORTED_TOOL" }),
        });
        continue;
      }

      const name = call.function.name;
      const args = readToolArguments(call);

      if (args === null) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify({
            error: "VALIDATION_ERROR",
            message: "Arguments were not valid JSON. Send them again.",
          }),
        });
        continue;
      }

      if (MUTATING_TOOLS.has(name)) {
        if (pending) {
          // One confirmation at a time; the rest are dropped rather than queued
          // so the user is never approving something they cannot see.
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              status: "SKIPPED",
              message: "Another change is already awaiting confirmation.",
            }),
          });
          continue;
        }

        try {
          preview = await buildActionPreview(name, args, context);
          pending = { tool: name, args, createdAt: Date.now() };

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify({
              status: "AWAITING_USER_CONFIRMATION",
            }),
          });
        } catch (error) {
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: toToolErrorPayload(error),
          });
        }

        continue;
      }

      try {
        const result = await executeTool(name, args, context);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      } catch (error) {
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toToolErrorPayload(error),
        });
      }
    }

    if (pending) {
      return {
        reply: preview,
        pendingAction: pending,
        // Recorded as an internal note, **not** as the preview verbatim.
        //
        // Storing the rendered preview put a perfect example of it in the
        // model's own history, labelled as something the assistant says. The
        // model then reproduced that text directly instead of calling the tool
        // — which looks identical to the user but sets no pending action, so
        // the following "כן" had nothing to confirm and the change never
        // happened. Each imitation added another example, so the failure was
        // self-reinforcing and only appeared once a conversation had one
        // successful confirmation in it.
        //
        // The note still carries what a follow-up like "actually make it
        // urgent" needs to refer back to, in a shape that is useless to copy.
        history: trimHistory([
          ...history,
          { role: "user", content: input.message },
          {
            role: "assistant",
            content: `(מערכת: הוצגה בקשת אישור ל-${pending.tool} עם ${JSON.stringify(pending.args)})`,
          },
        ]),
      };
    }
  }

  logger.warn("Agent turn hit the iteration ceiling", { uid: input.uid });

  return {
    reply: "לא הצלחתי להשלים את הבקשה. נסה לפרק אותה לשני שלבים.",
    pendingAction: null,
    history,
  };
}


/**
 * Apply an action the user approved.
 *
 * The stored arguments are re-validated by `executeTool`, and the write itself
 * still goes through `/api/v1` as that user — so an action that became invalid
 * while it waited (the task was deleted in the web app, the project was renamed)
 * fails the same way it would have failed at the time.
 */
export async function applyPendingAction(
  uid: string,
  baseUrl: string,
  action: PendingAction,
): Promise<string> {
  if (Date.now() - action.createdAt > PENDING_ACTION_TTL_MS) {
    return "בקשת האישור פגה. נסח את הבקשה שוב ואבצע אותה.";
  }

  const context = new ToolContext(createAgentApiClient(uid, baseUrl));

  try {
    const result = await executeTool(action.tool, action.args, context);
    return describeCompletedAction(action.tool, result);
  } catch (error) {
    if (isAppError(error)) {
      logger.warn("Confirmed action failed", {
        uid,
        tool: action.tool,
        code: error.code,
      });

      return `לא הצלחתי לבצע את הפעולה: ${error.message}`;
    }

    logger.error("Confirmed action failed unexpectedly", {
      uid,
      tool: action.tool,
      error,
    });

    return "לא הצלחתי לבצע את הפעולה. נסה שוב.";
  }
}
