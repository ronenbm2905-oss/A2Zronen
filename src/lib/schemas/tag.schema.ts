import { z } from "zod";

import { LIMITS } from "@/constants/limits";

import { colorTokenSchema, requiredText } from "./common.schema";

const tagShape = {
  name: requiredText(LIMITS.tag.nameMax, "יש להזין שם לתגית"),
  color: colorTokenSchema,
};

export const createTagSchema = z.object({
  ...tagShape,
  color: tagShape.color.default("sky"),
});

export const updateTagSchema = z
  .object(tagShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "לא נשלחו שדות לעדכון");

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
