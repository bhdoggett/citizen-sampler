import { prodKeys } from "./prod";
import { devKeys } from "./dev";

const keys = process.env.NODE_ENV === "production" ? prodKeys : devKeys;

export default keys;
