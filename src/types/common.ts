/** Shared primitive types used across the domain layers. */

export type ID = string;

/** ISO 8601 string — the wire format for all timestamps in this system. */
export type ISODateString = string;

export type Nullable<T> = T | null;
export type Maybe<T> = T | null | undefined;

/** Recursively marks every property optional — useful for PATCH payloads. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export interface Timestamps {
  createdAt: ISODateString;
  updatedAt: ISODateString;
}

/** Standard envelope for paginated collections. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
