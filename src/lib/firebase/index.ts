/**
 * Client-side Firebase surface.
 *
 * `./admin` is deliberately **not** re-exported here. It carries the service
 * account and is marked `server-only`; route handlers and server services must
 * import it by its full path so the boundary stays visible at every call site.
 */
export {
  getFirebaseApp,
  getFirebaseAuth,
  getFirestoreDb,
  readFirebaseConfig,
} from "./client";
export {
  readEnum,
  readNullableNumber,
  readNullableString,
  readString,
  readStringArray,
  tsToIso,
  tsToIsoRequired,
} from "./converters";
