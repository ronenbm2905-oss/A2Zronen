import type { ColorToken } from "./color";
import type { ID, ISODateString } from "./common";

export interface Tag {
  id: ID;
  userId: ID;
  name: string;
  color: ColorToken;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
