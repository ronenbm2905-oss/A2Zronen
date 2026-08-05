import { z } from "zod";

import { LIMITS } from "@/constants/limits";
import {
  TASK_DUE_FILTERS,
  TASK_PRIORITIES,
  TASK_SORT_FIELDS,
  TASK_STATUSES,
} from "@/types";

import {
  csvOf,
  csvOfIds,
  idSchema,
  limitedText,
  nullableIsoDate,
  requiredText,
} from "./common.schema";

const tagIdsSchema = z
  .array(idSchema)
  .max(LIMITS.task.tagIdsMax, `אפשר לשייך עד ${LIMITS.task.tagIdsMax} תגיות`)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "לא ניתן לשייך את אותה תגית פעמיים",
  );

/**
 * The writable surface of a task, without defaults — see the note in
 * `common.schema.ts` for why the defaults live on the create schema only.
 *
 * `userId` is deliberately absent from both schemas. The server takes the owner
 * from the verified ID token and never from the payload, so there is no field
 * here for a caller to try to spoof.
 */
const taskShape = {
  title: requiredText(LIMITS.task.titleMax, "יש להזין כותרת למשימה"),
  description: limitedText(LIMITS.task.descriptionMax),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: nullableIsoDate,
  projectId: idSchema.nullable(),
  tagIds: tagIdsSchema,
};

export const createTaskSchema = z.object({
  ...taskShape,
  description: taskShape.description.default(""),
  status: taskShape.status.default("todo"),
  priority: taskShape.priority.default("medium"),
  dueDate: taskShape.dueDate.default(null),
  projectId: taskShape.projectId.default(null),
  tagIds: taskShape.tagIds.default([]),
});

/**
 * Every field optional, but `.strict()` so a stray `userId` or `createdAt` in
 * the body is a 400 rather than something silently ignored, and a body with no
 * recognised fields is rejected outright.
 */
export const updateTaskSchema = z
  .object(taskShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "לא נשלחו שדות לעדכון");

/** Filter + sort state. Shared by the tasks screen URL and `GET /api/v1/tasks`. */
export const taskFilterSchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  status: csvOf(TASK_STATUSES),
  priority: csvOf(TASK_PRIORITIES),
  projectId: idSchema.nullable().optional().default(null),
  tagIds: csvOfIds,
  due: z.enum(TASK_DUE_FILTERS).optional().default("all"),
  sort: z.enum(TASK_SORT_FIELDS).optional().default("updatedAt"),
  direction: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
