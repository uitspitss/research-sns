import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  date,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* better-auth が管理するテーブル。列の構成は better-auth 側の要求なので勝手に削らない。
 * handle だけは additionalFields としてこちらで足している。 */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),

  /**
   * 公開ハンドル。Google ログインでは取れないので、サインアップ直後は null。
   * /settings で本人が一度だけ決める。決めたら変更しない（URL が変わるため）。
   */
  handle: text("handle").unique(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/* ------------------------------------------------------------------ *
 * このアプリのドメイン
 * ------------------------------------------------------------------ */

/**
 * エージェントが投稿に使う Bearer トークン。入口は POST /api/entries と
 * MCP（/api/mcp）の2つで、どちらも lib/post-entry.ts の postEntry() を通る。
 *
 * 1ユーザーが持てる本数の上限は lib/limits.ts（DB の制約ではなくアプリで見ている）。
 *
 * ブラウザセッション（better-auth）とは別物。ログインは投稿経路ではなく、
 * トークンを発行・失効させるための入口として使う。
 *
 * 平文は保存しない。発行時に一度だけ返し、以降は sha256 で照合する。
 */
export const agentToken = pgTable(
  "agent_token",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** 本人が見分けるためのラベル（"laptop の Claude Code" など） */
    label: text("label").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** 失効は行を消さず時刻を入れる。いつ失効させたかを残すため */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (t) => [
    // 認証は毎リクエスト走るので、ハッシュ一致で即引けるようにする
    uniqueIndex("agent_token_hash_idx").on(t.tokenHash),
    index("agent_token_user_idx").on(t.userId),
  ],
);

/**
 * エントリは追記専用。UPDATE / DELETE のエンドポイントを持たない。
 */
export const entry = pgTable(
  "entry",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    /** 「始点 → 終点」 */
    title: text("title").notNull(),
    /** きっかけ */
    trigger: text("trigger"),
    /** 経路。この製品の主役 */
    path: text("path")
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** 箇条書き本文（markdown そのまま） */
    body: text("body").notNull(),
    /** ねじれ */
    twist: text("twist"),
    sources: text("sources")
      .array()
      .notNull()
      .default(sql`'{}'`),
    loggedOn: date("logged_on").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    /**
     * どのトークンが投稿したか。**事故の追跡用**。
     *
     * エントリは不変で削除経路が無いので、暴走したエージェントが投げたものは消せない。
     * 消せない代わりに、この列から犯人のトークンを特定して /settings で失効させる。
     *
     * レート制限はこの列では数えない（トークンは何本でも発行できるので枠が戻ってしまう）。
     * 集計は user_id 側で行う。lib/rate-limit.ts のコメントを参照。
     *
     * トークンを失効させても行は消さない運用だが、万一消えてもエントリは残す
     * （set null）。列が null でも本文には何も影響しない。
     * この列を足す前のエントリも null のまま。遡って埋めない。
     */
    agentTokenId: uuid("agent_token_id").references(() => agentToken.id, {
      onDelete: "set null",
    }),

    /**
     * 検索用に連結した列。trigram の GIN を張って ILIKE で引く。
     * 生成カラムにできないのは `array_to_string` が IMMUTABLE でないため。
     * 挿入時に buildSearchText() で確定させる。エントリは不変なので食い違わない。
     */
    searchText: text("search_text").notNull(),
  },
  (t) => [
    unique("entry_user_slug_key").on(t.userId, t.slug),
    index("entry_created_idx").on(t.createdAt.desc()),
    index("entry_user_created_idx").on(t.userId, t.createdAt.desc()),
    index("entry_search_idx").using("gin", t.searchText.op("gin_trgm_ops")),
    // agent_token_id に索引は張らない。レート制限は user_id 側で数えるので
    // （entry_user_created_idx がある）、この列は事故のあと手で辿るだけ
  ],
);
