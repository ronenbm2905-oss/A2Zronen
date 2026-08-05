import { z } from "zod";

import { LIMITS } from "@/constants/limits";

import { colorTokenSchema, limitedText, requiredText } from "./common.schema";

const projectShape = {
  name: requiredText(LIMITS.project.nameMax, "יש להזין שם לפרויקט"),
  description: limitedText(LIMITS.project.descriptionMax),
  color: colorTokenSchema,
};

export const createProjectSchema = z.object({
  ...projectShape,
  description: projectShape.description.default(""),
  color: projectShape.color.default("sky"),
});

export const updateProjectSchema = z
  .object(projectShape)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "לא נשלחו שדות לעדכון");

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
