import "server-only";

import type { ChatCompletionFunctionTool } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/constants/task";
import { AppError } from "@/lib/errors";
import {
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Project,
  type Tag,
  type Task,
  type TaskDueFilter,
} from "@/types";

import type { AgentApiClient } from "./api-caller";
import { dateOnlyToIso, isoToDateOnly, todayDateOnly } from "./date-zone";

/**
 * The agent's capability surface.
 *
 * Two rules shape every definition here.
 *
 * **Names, not ids, in the model's vocabulary.** A language model cannot know a
 * Firestore id, and asking it to fetch one before every write turns a
 * one-sentence request into four round-trips it can get wrong. Projects and tags
 * are therefore addressed by name and resolved here against the user's own
 * records — which also means an unknown name is a clear error the model can
 * relay ("there's no project called X") rather than a silent mis-assignment.
 *
 * **Mutating tools are declared, never executed here.** `create_task`,
 * `update_task` and `delete_task` appear in {@link MUTATING_TOOLS}; the agent
 * loop intercepts them, renders a preview, and only calls {@link executeTool}
 * after the user has said yes. Nothing in this file decides that — the split
 * exists so a change to the tool list cannot accidentally widen what runs
 * unconfirmed.
 */

export const MUTATING_TOOLS = new Set([
  "create_task",
  "update_task",
  "delete_task",
]);

/** Enough rows to answer "what's open?"; few enough to keep a turn affordable. */
const MAX_TASK_RESULTS = 25;

/* ---------------------------------------------------------------------------
 * Argument schemas — the model's output is untrusted input like any other
 * ------------------------------------------------------------------------ */

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD");

const listTasksArgs = z.object({
  status: z.array(z.enum(TASK_STATUSES)).optional(),
  priority: z.array(z.enum(TASK_PRIORITIES)).optional(),
  due: z.enum(TASK_DUE_FILTERS).optional(),
  projectName: z.string().optional(),
  tagNames: z.array(z.string()).optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().max(MAX_TASK_RESULTS).optional(),
});

const createTaskArgs = z.object({
  title: z.string().trim().min(1),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateOnlySchema.nullish(),
  projectName: z.string().nullish(),
  tagNames: z.array(z.string()).optional(),
});

const updateTaskArgs = z.object({
  taskId: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateOnlySchema.nullish(),
  projectName: z.string().nullish(),
  tagNames: z.array(z.string()).optional(),
});

const deleteTaskArgs = z.object({ taskId: z.string().trim().min(1) });

const getTaskArgs = z.object({ taskId: z.string().trim().min(1) });

/* ---------------------------------------------------------------------------
 * Tool definitions sent to the model
 * ------------------------------------------------------------------------ */

function tool(
  name: string,
  description: string,
  parameters: Record<string, unknown>,
): ChatCompletionFunctionTool {
  return {
    type: "function",
    function: { name, description, parameters },
  };
}

const statusEnum = {
  type: "string",
  enum: [...TASK_STATUSES],
  description: "todo = לביצוע, in_progress = בתהליך, done = הושלם",
};

const priorityEnum = {
  type: "string",
  enum: [...TASK_PRIORITIES],
  description: "low = נמוכה, medium = בינונית, high = גבוהה, urgent = דחופה",
};

export const AGENT_TOOLS: ChatCompletionFunctionTool[] = [
  tool(
    "list_tasks",
    "Search and list the user's tasks. Every filter is optional and they combine with AND. Use this before any update or delete so you have the real task id.",
    {
      type: "object",
      properties: {
        status: { type: "array", items: statusEnum },
        priority: { type: "array", items: priorityEnum },
        due: {
          type: "string",
          enum: [...TASK_DUE_FILTERS],
          description:
            "today = due today, overdue = past due and not done, upcoming = due after today, none = no due date, all = no date filter",
        },
        projectName: {
          type: "string",
          description: "Exact or partial project name, in Hebrew.",
        },
        tagNames: {
          type: "array",
          items: { type: "string" },
          description: "Task must carry every tag listed.",
        },
        search: {
          type: "string",
          description: "Free text matched against title and description.",
        },
        limit: { type: "integer", minimum: 1, maximum: MAX_TASK_RESULTS },
      },
      additionalProperties: false,
    },
  ),

  tool("get_task", "Fetch one task in full by its id.", {
    type: "object",
    properties: { taskId: { type: "string" } },
    required: ["taskId"],
    additionalProperties: false,
  }),

  tool(
    "get_dashboard",
    "Aggregate counts across all of the user's tasks: totals, open, completed, due today, overdue, and breakdowns by status and priority. Use it for 'what's my status', summaries and progress questions.",
    { type: "object", properties: {}, additionalProperties: false },
  ),

  tool(
    "list_projects",
    "List the user's projects with the number of tasks in each.",
    { type: "object", properties: {}, additionalProperties: false },
  ),

  tool("list_tags", "List the user's tags.", {
    type: "object",
    properties: {},
    additionalProperties: false,
  }),

  tool(
    "create_task",
    "Create a task. Requires the user's confirmation, which the system handles — call this as soon as you have a title, and do not ask for confirmation yourself.",
    {
      type: "object",
      properties: {
        title: { type: "string", description: "Short Hebrew title." },
        description: { type: "string" },
        status: statusEnum,
        priority: priorityEnum,
        dueDate: {
          type: ["string", "null"],
          description: "YYYY-MM-DD, resolved against today's date given to you.",
        },
        projectName: {
          type: ["string", "null"],
          description: "Must match an existing project name.",
        },
        tagNames: { type: "array", items: { type: "string" } },
      },
      required: ["title"],
      additionalProperties: false,
    },
  ),

  tool(
    "update_task",
    "Change fields on an existing task. Send only the fields that change. Requires the user's confirmation, which the system handles.",
    {
      type: "object",
      properties: {
        taskId: { type: "string", description: "From list_tasks or get_task." },
        title: { type: "string" },
        description: { type: "string" },
        status: statusEnum,
        priority: priorityEnum,
        dueDate: { type: ["string", "null"], description: "YYYY-MM-DD or null." },
        projectName: { type: ["string", "null"] },
        tagNames: { type: "array", items: { type: "string" } },
      },
      required: ["taskId"],
      additionalProperties: false,
    },
  ),

  tool(
    "delete_task",
    "Delete a task permanently. Requires the user's confirmation, which the system handles.",
    {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
      additionalProperties: false,
    },
  ),
];

/* ---------------------------------------------------------------------------
 * Execution
 * ------------------------------------------------------------------------ */

/**
 * Per-turn state.
 *
 * The lookup caches matter: a single turn can touch projects and tags several
 * times (resolve a filter, then shape the results for display), and each lookup
 * is an authenticated HTTP round-trip. They are per-turn rather than global
 * precisely because they are a user's own records — a process-wide cache would
 * be a tenancy bug waiting to happen.
 */
export class ToolContext {
  readonly api: AgentApiClient;
  private projects: Project[] | null = null;
  private tags: Tag[] | null = null;

  constructor(api: AgentApiClient) {
    this.api = api;
  }

  async allProjects(): Promise<Project[]> {
    this.projects ??= await this.api.call<Project[]>("/projects");
    return this.projects;
  }

  async allTags(): Promise<Tag[]> {
    this.tags ??= await this.api.call<Tag[]>("/tags");
    return this.tags;
  }

  /** Invalidate after a write that could have changed the reference lists. */
  reset(): void {
    this.projects = null;
    this.tags = null;
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Match a name the model produced against the user's records.
 *
 * Exact (case- and whitespace-insensitive) first, then a unique substring match.
 * A substring that matches several records is treated as *no* match: acting on
 * an ambiguous "שיווק" when both "שיווק דיגיטלי" and "שיווק מוצר" exist would be
 * a coin flip, and the model can ask.
 */
function matchByName<T extends { name: string }>(
  items: readonly T[],
  name: string,
): T | null {
  const needle = normalize(name);
  if (!needle) return null;

  const exact = items.find((item) => normalize(item.name) === needle);
  if (exact) return exact;

  const partial = items.filter((item) => normalize(item.name).includes(needle));
  return partial.length === 1 ? partial[0] : null;
}

async function resolveProjectId(
  context: ToolContext,
  name: string | null | undefined,
): Promise<string | null | undefined> {
  if (name === undefined) return undefined;
  if (name === null || name.trim() === "") return null;

  const project = matchByName(await context.allProjects(), name);

  if (!project) {
    throw AppError.validation(
      `לא נמצא פרויקט בשם «${name}». בקש מהמשתמש לבחור מתוך הפרויקטים הקיימים.`,
    );
  }

  return project.id;
}

async function resolveTagIds(
  context: ToolContext,
  names: string[] | undefined,
): Promise<string[] | undefined> {
  if (names === undefined) return undefined;

  const tags = await context.allTags();
  const ids: string[] = [];

  for (const name of names) {
    const tag = matchByName(tags, name);

    if (!tag) {
      throw AppError.validation(
        `לא נמצאה תגית בשם «${name}». בקש מהמשתמש לבחור מתוך התגיות הקיימות.`,
      );
    }

    ids.push(tag.id);
  }

  return ids;
}

/** The task shape the model reads. Ids are kept; internals are not. */
async function shapeTask(context: ToolContext, task: Task) {
  const [projects, tags] = await Promise.all([
    context.allProjects(),
    context.allTags(),
  ]);

  return {
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    status: task.status,
    statusHe: TASK_STATUS_LABELS[task.status],
    priority: task.priority,
    priorityHe: TASK_PRIORITY_LABELS[task.priority],
    dueDate: isoToDateOnly(task.dueDate),
    project: projects.find((item) => item.id === task.projectId)?.name ?? null,
    tags: task.tagIds
      .map((id) => tags.find((tag) => tag.id === id)?.name)
      .filter((name): name is string => Boolean(name)),
    updatedAt: task.updatedAt,
  };
}

/**
 * Due-date presets, applied here because the API has no such filter.
 *
 * Comparison is on `YYYY-MM-DD` strings resolved in the app timezone, not on the
 * `isToday`/`isPastDue` helpers in `@/utils/date`. Those read the *host's* local
 * timezone, which on a UTC server would put "today" three hours off from what
 * the user sees in the browser — and lexicographic ordering on an ISO date is
 * chronological ordering, so nothing is lost by comparing text.
 */
function matchesDue(task: Task, due: TaskDueFilter): boolean {
  const dueDate = isoToDateOnly(task.dueDate);
  const today = todayDateOnly();

  switch (due) {
    case "today":
      return dueDate === today;
    case "overdue":
      return task.status !== "done" && dueDate !== null && dueDate < today;
    case "upcoming":
      return dueDate !== null && dueDate > today;
    case "none":
      return dueDate === null;
    default:
      return true;
  }
}

/**
 * Run a tool and return a JSON-serializable result for the model.
 *
 * Mutating tools reach this function only after confirmation — see
 * {@link MUTATING_TOOLS} and the agent loop.
 */
export async function executeTool(
  name: string,
  rawArgs: unknown,
  context: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "list_tasks":
      return listTasks(context, listTasksArgs.parse(rawArgs ?? {}));

    case "get_task": {
      const { taskId } = getTaskArgs.parse(rawArgs);
      return shapeTask(context, await context.api.call<Task>(`/tasks/${taskId}`));
    }

    case "get_dashboard":
      return dashboard(context);

    case "list_projects":
      return listProjects(context);

    case "list_tags":
      return (await context.allTags()).map((tag) => ({
        id: tag.id,
        name: tag.name,
      }));

    case "create_task":
      return createTask(context, createTaskArgs.parse(rawArgs));

    case "update_task":
      return updateTask(context, updateTaskArgs.parse(rawArgs));

    case "delete_task": {
      const { taskId } = deleteTaskArgs.parse(rawArgs);
      const task = await context.api.call<Task>(`/tasks/${taskId}`);
      await context.api.call(`/tasks/${taskId}`, { method: "DELETE" });

      return { deleted: true, id: taskId, title: task.title };
    }

    default:
      throw AppError.validation(`Unknown tool: ${name}`);
  }
}

async function listTasks(
  context: ToolContext,
  args: z.infer<typeof listTasksArgs>,
) {
  const projectId = args.projectName
    ? await resolveProjectId(context, args.projectName)
    : undefined;

  const tagIds = await resolveTagIds(context, args.tagNames);

  const tasks = await context.api.call<Task[]>("/tasks", {
    query: {
      status: args.status?.join(","),
      priority: args.priority?.join(","),
      projectId: projectId ?? undefined,
      tagIds: tagIds?.join(","),
      search: args.search,
    },
  });

  const filtered = tasks.filter((task) => matchesDue(task, args.due ?? "all"));
  const limited = filtered.slice(0, args.limit ?? MAX_TASK_RESULTS);

  return {
    // The model needs to know when it is looking at a truncated view, or it
    // will happily answer "you have 25 tasks" when there are eighty.
    totalMatched: filtered.length,
    returned: limited.length,
    tasks: await Promise.all(limited.map((task) => shapeTask(context, task))),
  };
}

async function listProjects(context: ToolContext) {
  const projects = await context.allProjects();

  return projects.map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description || undefined,
  }));
}

async function dashboard(context: ToolContext) {
  const tasks = await context.api.call<Task[]>("/tasks");

  const open = tasks.filter((task) => task.status !== "done");

  const count = <T extends string>(rows: Task[], key: (task: Task) => T) =>
    rows.reduce<Record<string, number>>((accumulator, task) => {
      const value = key(task);
      accumulator[value] = (accumulator[value] ?? 0) + 1;
      return accumulator;
    }, {});

  return {
    total: tasks.length,
    open: open.length,
    completed: tasks.length - open.length,
    dueToday: open.filter((task) => matchesDue(task, "today")).length,
    overdue: open.filter((task) => matchesDue(task, "overdue")).length,
    byStatus: count(tasks, (task) => task.status),
    // Breakdowns cover open work: a chart dominated by finished urgent tasks
    // says nothing about what needs attention. Mirrors `useDashboardStats`.
    byPriority: count(open, (task) => task.priority),
    completionRate:
      tasks.length === 0
        ? 0
        : Math.round(((tasks.length - open.length) / tasks.length) * 100),
  };
}

async function createTask(
  context: ToolContext,
  args: z.infer<typeof createTaskArgs>,
) {
  const body = {
    title: args.title,
    ...(args.description === undefined ? {} : { description: args.description }),
    ...(args.status === undefined ? {} : { status: args.status }),
    ...(args.priority === undefined ? {} : { priority: args.priority }),
    dueDate: args.dueDate ? dateOnlyToIso(args.dueDate) : null,
    projectId: (await resolveProjectId(context, args.projectName)) ?? null,
    tagIds: (await resolveTagIds(context, args.tagNames)) ?? [],
  };

  const task = await context.api.call<Task>("/tasks", {
    method: "POST",
    body,
  });

  return shapeTask(context, task);
}

async function updateTask(
  context: ToolContext,
  args: z.infer<typeof updateTaskArgs>,
) {
  const projectId = await resolveProjectId(context, args.projectName);
  const tagIds = await resolveTagIds(context, args.tagNames);

  // `updateTaskSchema` is `.strict()` and rejects an empty body, so only fields
  // the model actually supplied may appear here.
  const body: Record<string, unknown> = {};

  if (args.title !== undefined) body.title = args.title;
  if (args.description !== undefined) body.description = args.description;
  if (args.status !== undefined) body.status = args.status;
  if (args.priority !== undefined) body.priority = args.priority;
  if (args.dueDate !== undefined) {
    body.dueDate = args.dueDate ? dateOnlyToIso(args.dueDate) : null;
  }
  if (projectId !== undefined) body.projectId = projectId;
  if (tagIds !== undefined) body.tagIds = tagIds;

  if (Object.keys(body).length === 0) {
    throw AppError.validation("לא צוינו שדות לעדכון.");
  }

  const task = await context.api.call<Task>(`/tasks/${args.taskId}`, {
    method: "PATCH",
    body,
  });

  return shapeTask(context, task);
}

/* ---------------------------------------------------------------------------
 * Confirmation previews
 * ------------------------------------------------------------------------ */

/**
 * The Hebrew summary shown before a change is applied.
 *
 * Built from the *arguments*, not from the model's prose. That is the point: the
 * user approves the operation that will actually run, so a model that says
 * "I'll set it to high" while passing `urgent` gets caught by the person reading
 * the preview.
 */
export async function buildActionPreview(
  name: string,
  rawArgs: unknown,
  context: ToolContext,
): Promise<string> {
  switch (name) {
    case "create_task": {
      const args = createTaskArgs.parse(rawArgs);
      const lines = [`📝 ליצור משימה חדשה:`, `• כותרת: ${args.title}`];

      if (args.description) lines.push(`• תיאור: ${args.description}`);
      lines.push(
        `• עדיפות: ${TASK_PRIORITY_LABELS[args.priority ?? "medium"]}`,
        `• סטטוס: ${TASK_STATUS_LABELS[args.status ?? "todo"]}`,
      );
      if (args.dueDate) lines.push(`• תאריך יעד: ${args.dueDate}`);
      if (args.projectName) lines.push(`• פרויקט: ${args.projectName}`);
      if (args.tagNames?.length) lines.push(`• תגיות: ${args.tagNames.join(", ")}`);

      return `${lines.join("\n")}\n\nלאשר?`;
    }

    case "update_task": {
      const args = updateTaskArgs.parse(rawArgs);
      const task = await context.api.call<Task>(`/tasks/${args.taskId}`);
      const lines = [`✏️ לעדכן את המשימה «${task.title}»:`];

      if (args.title !== undefined) lines.push(`• כותרת ← ${args.title}`);
      if (args.description !== undefined) {
        lines.push(`• תיאור ← ${args.description || "(ריק)"}`);
      }
      if (args.status !== undefined) {
        lines.push(`• סטטוס ← ${TASK_STATUS_LABELS[args.status]}`);
      }
      if (args.priority !== undefined) {
        lines.push(`• עדיפות ← ${TASK_PRIORITY_LABELS[args.priority]}`);
      }
      if (args.dueDate !== undefined) {
        lines.push(`• תאריך יעד ← ${args.dueDate ?? "ללא"}`);
      }
      if (args.projectName !== undefined) {
        lines.push(`• פרויקט ← ${args.projectName ?? "ללא"}`);
      }
      if (args.tagNames !== undefined) {
        lines.push(`• תגיות ← ${args.tagNames.join(", ") || "ללא"}`);
      }

      return `${lines.join("\n")}\n\nלאשר?`;
    }

    case "delete_task": {
      const { taskId } = deleteTaskArgs.parse(rawArgs);
      const task = await context.api.call<Task>(`/tasks/${taskId}`);

      return (
        `🗑️ למחוק את המשימה «${task.title}»?\n\n` +
        "הפעולה אינה הפיכה.\n\nלאשר?"
      );
    }

    default:
      throw AppError.validation(`Tool ${name} does not require confirmation.`);
  }
}

/** The confirmation message shown *after* a change has been applied. */
export function describeCompletedAction(name: string, result: unknown): string {
  const title =
    typeof result === "object" && result !== null && "title" in result
      ? String((result as { title: unknown }).title)
      : "";

  switch (name) {
    case "create_task":
      return `✅ המשימה «${title}» נוצרה.`;
    case "update_task":
      return `✅ המשימה «${title}» עודכנה.`;
    case "delete_task":
      return `✅ המשימה «${title}» נמחקה.`;
    default:
      return "✅ הפעולה בוצעה.";
  }
}
