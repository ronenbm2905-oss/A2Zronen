import type { NextRequest } from "next/server";

import { parseJsonBody, withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { updateProfileSchema } from "@/lib/schemas";
import { getProfile, updateProfile } from "@/services/server";

export const dynamic = "force-dynamic";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  return getProfile(user);
});

/**
 * Only `displayName` is writable. Changing an email address re-runs Firebase's
 * verification flow and belongs with the auth screens, not here.
 */
export const PATCH = withApiHandler(async (request: NextRequest) => {
  const user = await requireUser(request);
  const input = await parseJsonBody(request, updateProfileSchema);

  return updateProfile(user, input);
});
