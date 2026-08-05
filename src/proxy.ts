import { NextResponse, type NextRequest } from "next/server";

import { appConfig } from "@/config/app";

/**
 * Request-interception layer.
 *
 * In Next.js 16 the `middleware` file convention was deprecated and renamed to
 * `proxy` — same capability, current name.
 * See https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * Pass-through by design. It only stamps a correlation id so a request can be
 * traced from the edge through to the API handlers. Authentication, redirects
 * and rewrites are deliberately not implemented in this phase.
 */
export function proxy(request: NextRequest) {
  // Respect an id supplied upstream so traces survive across services.
  const requestId =
    request.headers.get(appConfig.requestIdHeader) ?? crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(appConfig.requestIdHeader, requestId);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(appConfig.requestIdHeader, requestId);

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and metadata files:
     * - _next/static  (build output)
     * - _next/image   (image optimizer)
     * - favicon.ico, sitemap.xml, robots.txt
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
