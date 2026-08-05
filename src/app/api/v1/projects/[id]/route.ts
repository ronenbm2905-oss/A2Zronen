import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/schemas";
import { deleteProject, getProject, updateProject } from "@/services/server";

export const dynamic = "force-dynamic";

type Context = RouteContext<"/api/v1/projects/[id]">;

export const GET = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;

  return getProject(uid, id);
});

export const PATCH = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;
  const input = await parseJsonBody(request, updateProjectSchema);

  return updateProject(uid, id, input);
});

/** Detaches the project's tasks rather than deleting them. */
export const DELETE = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;

  return deleteProject(uid, id);
});
