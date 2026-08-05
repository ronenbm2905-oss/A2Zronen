import type { NextRequest } from "next/server";

import { parseJsonBody, parseSearchParams, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createTaskSchema, taskFilterSchema } from "@/lib/schemas";
import { createTask, listTasks } from "@/services/server";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);
  const filter = parseSearchParams(request, taskFilterSchema);

  return listTasks(uid, filter);
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);
  const input = await parseJsonBody(request, createTaskSchema);

  return createTask(uid, input);
});
