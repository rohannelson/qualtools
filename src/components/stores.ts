import { atom } from "nanostores";
import type { Row } from "./types";

export const $rows = atom<Row[]>([]);
