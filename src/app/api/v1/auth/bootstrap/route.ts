import type { NextRequest } from "next/server";

import { withApiHandler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { bootstrapUser } from "@/services/server";

export const dynamic = "force-dynamic";

/**
 * First-run setup, called once right after registration.
 *
 * Idempotent, and takes no body: everything it needs comes from the verified
 * token. Calling it again is harmless, which matters because the client fires it
 * after `createUserWithEmailAndPassword` and a retry must not duplicate the
 * starter project or tags.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await requireUser(request);

  return bootstrapUser(user);
});
