import type { ColorToken } from "./color";
import type { ID, ISODateString } from "./common";

export interface Project {
  id: ID;
  userId: ID;
  name: string;
  /** `""` when empty, mirroring `Task.description`. */
  description: string;
  color: ColorToken;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
