import type { api } from "@posefighter/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";

export type RoomView = NonNullable<FunctionReturnType<typeof api.rooms.getRoomView>>;
export type RoomPlayer = RoomView["players"][number];

export interface RoomSession {
  code: string;
  token: string;
  room: RoomView;
}
