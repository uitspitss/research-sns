/**
 * E2E 用 DB の準備。`nr test:e2e` が playwright を起動する**前に**一度だけ走る。
 *
 * Playwright の globalSetup ではなくこの位置に置く理由が2つある。
 *
 * 1. migration より先にアプリのサーバーが起動すると、`webServer.url` の
 *    ヘルスチェックがテーブルの無い DB を引いて 500 を返し、Playwright が
 *    「まだ起動していない」と判断して待ち続ける
 * 2. `/` は ISR（revalidate 60）なので、**最初のリクエストで内容が固定される**。
 *    サーバーが上がる前にデータを揃えておかないと、空のタイムラインが
 *    キャッシュされたまま 60 秒間返り続ける
 *
 * 開発用と同じコンテナの**別データベース**を使う（e2e/env.ts）。
 * 開発用の research_sns には一切触れない。
 */
import { Client } from "pg";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { agentToken, entry, session, user } from "@/db/schema";
// lib/limits.ts は何も import しないので静的に読める（lib/token.ts は lib/db を
// 引きずるので下で動的 import している）
import { POST_RATE_LIMITS } from "@/lib/limits";
import { buildSearchText } from "@/lib/search-text";
import { E2E_ADMIN_DATABASE_URL, E2E_DATABASE_URL, E2E_DB_NAME } from "./env";
import {
  E2E_AGENT_TOKEN,
  E2E_ENTRIES,
  E2E_RATE_LIMITED_TOKEN,
  E2E_USER,
  E2E_USER_NO_HANDLE,
  E2E_USER_RATE_LIMITED,
} from "./fixture";

// データベースを無ければ作る。`nr db:up` 済みならこれだけで E2E の下地が揃う。
// compose の db/init は**ボリュームが空のときしか流れない**ので、そちらに
// 置くと既存の開発環境では作られない。ここでやれば状態に依らず動く。
// postgres には `create database if not exists` が無いので存在を確かめてから作る。
const admin = new Client({ connectionString: E2E_ADMIN_DATABASE_URL });
await admin.connect();
const found = await admin.query("select 1 from pg_database where datname = $1", [E2E_DB_NAME]);
if (found.rowCount === 0) {
  // 識別子は値としてバインドできない。E2E_DB_NAME は定数なので埋め込んでよい
  await admin.query(`create database "${E2E_DB_NAME}"`);
}
await admin.end();

// `@/lib/db` は import 時点で process.env.DATABASE_URL を読むので使わない。
// 静的 import は巻き上げられて代入より先に評価されるため、環境変数を差し替える
// 方式にすると評価順に依存する。ここでは接続先を直接渡した専用インスタンスを作る。
const db = drizzle(E2E_DATABASE_URL);

// 拡張は drizzle-kit が migration に含められない。db/init/01-extensions.sql と同じ内容を
// **この**データベースに対して作る（拡張はデータベース単位）
await db.execute(sql`create extension if not exists pgcrypto`);
await db.execute(sql`create extension if not exists pg_trgm`);

await migrate(db, { migrationsFolder: "./db/migrations" });

// 前回の実行が残っているので毎回まっさらにする。
// entry は外部キーで user にぶら下がっているので消す順序がある。
await db.delete(entry);
await db.delete(agentToken);
await db.delete(session);
await db.delete(user);

await db.insert(user).values([
  { ...E2E_USER, emailVerified: true },
  { ...E2E_USER_NO_HANDLE, emailVerified: true },
  { ...E2E_USER_RATE_LIMITED, emailVerified: true },
]);

await db.insert(entry).values(
  E2E_ENTRIES.map((e) => ({
    userId: E2E_USER.id,
    slug: e.slug,
    title: e.title,
    trigger: e.trigger,
    path: [...e.path],
    body: e.body,
    twist: e.twist,
    sources: [...e.sources],
    loggedOn: e.loggedOn,
    // 生成カラムではないので挿入時に確定させる（db/schema.ts のコメント参照）
    searchText: buildSearchText({
      title: e.title,
      trigger: e.trigger,
      path: [...e.path],
      body: e.body,
      twist: e.twist,
    }),
  })),
);

// ハッシュは **本物の hashToken を使う**。ここで sha256 を書き写すと、lib 側を
// 変えたときに黙ってずれて、API のテストだけが理由の分からない 401 で落ちる。
// lib/token.ts は @/lib/db を引きずり、それが import 時点で DATABASE_URL を要求するので、
// 静的 import（巻き上げられる）ではなく代入の後に動的 import する。
process.env.DATABASE_URL = E2E_DATABASE_URL;
const { hashToken } = await import("@/lib/token");

const [, limitedToken] = await db
  .insert(agentToken)
  .values([
    {
      userId: E2E_USER.id,
      label: "e2e の固定トークン",
      tokenHash: await hashToken(E2E_AGENT_TOKEN),
    },
    {
      // **E2E_USER ではない。** 制限はユーザー単位なので、同じユーザーにすると
      // 投稿するテストが巻き添えで落ちる（fixture.ts のコメント参照）
      userId: E2E_USER_RATE_LIMITED.id,
      label: "e2e のレート制限済みトークン",
      tokenHash: await hashToken(E2E_RATE_LIMITED_TOKEN),
    },
  ])
  .returning({ id: agentToken.id });

// レート制限に達した状態を作る。理由と時刻の根拠は fixture.ts のコメントを参照
const filledAt = new Date(Date.now() - 12 * 60 * 60_000);
await db.insert(entry).values(
  Array.from({ length: POST_RATE_LIMITS.sustained.limit }, (_, i) => {
    const title = `レート制限の埋め草${i} → ダミー`;
    const path = ["埋め草", "ダミー"];
    const body = "- レート制限のテスト用";

    return {
      userId: E2E_USER_RATE_LIMITED.id,
      agentTokenId: limitedToken?.id,
      slug: `2026-01-01-f${String(i).padStart(3, "0")}`,
      title,
      trigger: null,
      path,
      body,
      twist: null,
      sources: [],
      loggedOn: "2026-01-01",
      createdAt: filledAt,
      searchText: buildSearchText({ title, trigger: null, path, body, twist: null }),
    };
  }),
);

console.log(`e2e db ready: ${E2E_ENTRIES.length} entries @${E2E_USER.handle}`);
process.exit(0);
