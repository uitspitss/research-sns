import { and, desc, eq, ilike, isNotNull, isNull, sql } from "drizzle-orm";
import { entry, user } from "@/db/schema";
import { db } from "./db";

/**
 * 投稿には handle が要る（lib/token.ts が handle 未設定を弾く）ので、エントリの著者に
 * handle が無いことはない。`user.handle` の型は nullable だが、ここで string に寄せる。
 *
 * 寄せないと `/e/null/{slug}` を組み立てる経路が表現でき、到達しない nullable が
 * MCP の出力スキーマとしてエージェントにまで配られる。
 * **クエリ側も必ず下の `visible` で絞ること**（読み取りはすべて絞ってある）。
 */
const authorHandle = sql<string>`${user.handle}`;

/** 上の型の言い分を実際に真にする条件 */
const handleOwned = isNotNull(user.handle);

/**
 * **公開されているエントリの条件。このファイルの読み取りは全部これを通す。**
 *
 * 削除は行を消さず `deleted_at` を入れるだけなので（理由は db/schema.ts。
 * 物理削除だとレート制限の履歴まで消えて枠が戻る）、絞り忘れた読み取りは
 * 消したはずのエントリをそのまま出す。**読み取りを足すときは必ずここを混ぜること。**
 *
 * 消えたことは E2E（`e2e/entry-delete.spec.ts`）が経路ごとに見張っている。
 * 新しい読み取り経路を足したら、あちらにも1本足すこと。
 */
const visible = and(handleOwned, isNull(entry.deletedAt));

/** 一覧に出す分だけ。本文は引かない（タイムラインで無駄に重くなるため） */
const listColumns = {
  slug: entry.slug,
  handle: authorHandle,
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
  /** null にならない。理由は authorHandle のコメント */
  handle: string;
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
    .where(visible)
    .orderBy(desc(entry.createdAt))
    .limit(limit);
}

export function listEntriesByHandle(handle: string, limit = 100): Promise<EntrySummary[]> {
  return db
    .select(listColumns)
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(and(visible, eq(user.handle, handle)))
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
    .where(and(visible, ilike(entry.searchText, `%${query}%`)))
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
    visible,
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
    .where(and(visible, eq(user.handle, handle), eq(entry.slug, slug)))
    .limit(1);

  return rows[0];
}

/**
 * 自分の経路を1本消す。**所有者を where に入れるのが要点。** 他人の slug を
 * 投げられても消えない。`unique(user_id, slug)` があるので当たるのは高々1行。
 *
 * **行は消さず `deleted_at` を入れる。** 物理削除にすると
 * `lib/rate-limit.ts` が数えている履歴まで消え、投稿 → 削除 → 投稿 で
 * 枠が戻ってしまう（制限を実質無効にできる）。本文は触らないので
 * `search_text` との食い違いも起きない。
 *
 * 既に消えている行を除いてあるので、二度押しは false になる。
 * 消せたかどうかだけを返す。「他人のもの」「もう無い」を区別しないのは、
 * 分けると他人のエントリが存在することを教えてしまうため。
 */
export async function deleteOwnEntry(userId: string, slug: string): Promise<boolean> {
  // 引く列を指定していないのは型の都合。lib/db.ts の db は neon-http と
  // node-postgres の**ユニオン**なので、多重定義された returning() は
  // 引数なしの側しか見えない（列を渡すと「Expected 0 arguments」になる）。
  // 当たるのは高々1行なので、全列返っても実質の差はない
  const deleted = await db
    .update(entry)
    .set({ deletedAt: new Date() })
    .where(and(eq(entry.userId, userId), eq(entry.slug, slug), isNull(entry.deletedAt)))
    .returning();

  return deleted.length > 0;
}

export async function handleExists(handle: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.handle, handle)).limit(1);
  return rows.length > 0;
}
