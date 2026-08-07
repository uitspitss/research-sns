import { and, desc, eq, ilike } from "drizzle-orm";
import { entry, user } from "@/db/schema";
import { db } from "./db";

/** 一覧に出す分だけ。本文は引かない（タイムラインで無駄に重くなるため） */
const listColumns = {
  slug: entry.slug,
  handle: user.handle,
  title: entry.title,
  trigger: entry.trigger,
  path: entry.path,
  loggedOn: entry.loggedOn,
} as const;

const detailColumns = {
  ...listColumns,
  body: entry.body,
  twist: entry.twist,
  sources: entry.sources,
} as const;

export type EntrySummary = {
  slug: string;
  handle: string | null;
  title: string;
  trigger: string | null;
  path: string[];
  loggedOn: string;
};

export type EntryDetail = EntrySummary & {
  body: string;
  twist: string | null;
  sources: string[];
};

/** タイムライン。新着順 */
export function listRecentEntries(limit = 40): Promise<EntrySummary[]> {
  return db
    .select(listColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

export function listEntriesByHandle(handle: string, limit = 100): Promise<EntrySummary[]> {
  return db
    .select(listColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(eq(user.handle, handle))
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

/**
 * 日本語なので全文検索インデックスではなく trigram + 部分一致で引く。
 * 対象は entry.search_text（挿入時に組み立てた検索用の連結列）。
 */
export function searchEntries(query: string, limit = 50): Promise<EntrySummary[]> {
  return db
    .select(listColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(ilike(entry.searchText, `%${query}%`))
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

/**
 * handle と検索語のどちらでも、両方でも、どちらでもなくても引ける一般形。
 * 上の3つは画面ごとに固定の引き方をするので残してある。こちらは
 * MCP の search_entries と GET /api/entries のように、条件が呼び出し時まで
 * 決まらない経路のためのもの。
 */
export type EntryQuery = { handle?: string | undefined; q?: string | undefined; limit?: number };

const entryFilters = ({ handle, q }: EntryQuery) =>
  [
    handle ? eq(user.handle, handle) : undefined,
    q ? ilike(entry.searchText, `%${q}%`) : undefined,
  ].filter((f) => f !== undefined);

/** 一覧向け。本文は引かない */
export function queryEntries({ limit = 20, ...where }: EntryQuery): Promise<EntrySummary[]> {
  const filters = entryFilters(where);

  return db
    .select(listColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

/** 同じ条件で本文まで引く。GET /api/entries はこちらを使う */
export function queryEntryDetails({ limit = 20, ...where }: EntryQuery): Promise<EntryDetail[]> {
  const filters = entryFilters(where);

  return db
    .select(detailColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

export async function findEntry(handle: string, slug: string): Promise<EntryDetail | undefined> {
  const rows = await db
    .select(detailColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(and(eq(user.handle, handle), eq(entry.slug, slug)))
    .limit(1);

  return rows[0];
}

export async function handleExists(handle: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.handle, handle)).limit(1);
  return rows.length > 0;
}
