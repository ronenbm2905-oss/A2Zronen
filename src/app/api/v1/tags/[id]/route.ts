import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateTagSchema } from "@/lib/schemas";
import { deleteTag, getTag, updateTag } from "@/services/server";

export const dynamic = "force-dynamic";

type Context = RouteContext<"/api/v1/tags/[id]">;

export const GET = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;

  return getTag(uid, id);
});

export const PATCH = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;
  const input = await parseJsonBody(request, updateTagSchema);

  return updateTag(uid, id, input);
});

/** Strips the tag from every task that carried it, then deletes it. */
export const DELETE = withApiHandler<Context>(async (request, context) => {
  const { uid } = await requireUser(request);
  const { id } = await context.params;

  return deleteTag(uid, id);
});
