import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * `firebase-admin` pulls in gRPC and other native/CJS-only dependencies.
   * Keeping it external means Turbopack `require()`s it at runtime from
   * `node_modules` instead of trying to trace and bundle it into the server
   * output — the same treatment Next gives every other Node-native SDK.
   */
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
