import type { NextRequest } from "next/server";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createProjectSchema } from "@/lib/schemas";
import { createProject, listProjects } from "@/services/server";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  return listProjects(uid);
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);
  const input = await parseJsonBody(request, createProjectSchema);

  return createProject(uid, input);
});
