import type { NextRequest } from "next/server";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createTagSchema } from "@/lib/schemas";
import { createTag, listTags } from "@/services/server";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);

  return listTags(uid);
});

export const POST = withApiHandler(async (request: NextRequest) => {
  const { uid } = await requireUser(request);
  const input = await parseJsonBody(request, createTagSchema);

  return createTag(uid, input);
});
