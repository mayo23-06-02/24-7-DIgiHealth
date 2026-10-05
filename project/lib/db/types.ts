import type { ColKind } from "./schema.generated";

/** An array of ids stored in a join table (e.g. favoritePractitionerIds). */
export interface ListSpec {
  table: string;
  /** Column on the join table that points at the owner row. */
  ownerCol: string;
  /** Owner field/column whose value `ownerCol` stores. Defaults to the owner's id. */
  ownerKeyCol?: string;
  /** Column on the join table holding the array element. */
  valueCol: string;
  /** Constant columns that scope this list inside a shared join table. */
  where?: Record<string, string>;
}

/** An array of sub-documents stored in a child table (e.g. allergies). */
export interface ChildSpec {
  table: string;
  /** FK column on the child table referencing the parent id. */
  fk: string;
  /** camelCase sub-field -> child column overrides (default: snake_case). */
  fields?: Record<string, string>;
  orderBy?: string;
}

export interface ModelConfig {
  name: string;
  table: string;
  /** Object key -> column prefix, e.g. { soapNotes: "soap_" }. */
  nest?: Record<string, string>;
  /** Explicit camelCase path -> column overrides. */
  columns?: Record<string, string>;
  /** Forward-only path -> column aliases (queries/writes only, never hydrated). */
  aliases?: Record<string, string>;
  /** Field path -> name of the model it references (for populate). */
  refs?: Record<string, string>;
  lists?: Record<string, ListSpec>;
  children?: Record<string, ChildSpec>;
  /** Columns that never surface on documents. */
  hidden?: string[];
  /** Raw-row hooks for shapes that do not fit the generic mapping. */
  fromRow?: (doc: Record<string, any>, row: Record<string, any>) => void;
  toRow?: (row: Record<string, any>, doc: Record<string, any>) => void;
  /** Paths that fromRow/toRow synthesise from several columns. */
  virtualPaths?: Record<string, { cols: string[] }>;
}

export type { ColKind };

export type Cond =
  | { k: "never" }
  | { k: "always" }
  | { k: "leaf"; col: string; op: string; val?: unknown }
  | { k: "and"; items: Cond[] }
  | { k: "or"; items: Cond[] };

export type SortSpec = string | Record<string, 1 | -1 | "asc" | "desc" | "ascending" | "descending"> | Array<[string, 1 | -1]>;
