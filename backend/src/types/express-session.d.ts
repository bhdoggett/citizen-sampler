import "express-session";
import { SongType } from "../../../shared/types/audioTypes";

declare module "express-session" {
  interface SessionData {
    tempSong?: SongType;
  }
}
