import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { testUtils } from "better-auth/plugins";
import { account, session, user, verification } from "@/db/schema";
import { e2eDb } from "./db";
import { E2E_AUTH_SECRET, E2E_BASE_URL } from "./env";

/**
 * E2E 専用の auth インスタンス。**`lib/auth.ts` とは別物。**
 *
 * `testUtils` プラグインが `ctx.test` に「指定したユーザーとして署名済みの
 * セッション Cookie を作る」ヘルパを生やす。これで Google のログイン画面を
 * 自動操作せずに認証済みの状態を作れる。
 *
 * プラグイン自身のドキュメントが「本番の auth config には入れるな、テスト専用の
 * インスタンスに入れろ」と言っている（条件付き spread にすると `ctx.test` の
 * 型推論が壊れる）。なのでここに分けてある。
 *
 * **Cookie の名前と署名は options から決まる。** secret を lib/auth.ts 側と
 * 食い違わせると、焼いた Cookie がアプリ側で検証に落ちる。エラーは出ず、
 * 単に「ログインしていない」扱いになるので気づきにくい。
 * playwright.config.ts の webServer.env が同じ値をサーバーにも渡している。
 */
export const testAuth = betterAuth({
  database: drizzleAdapter(e2eDb, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  secret: E2E_AUTH_SECRET,
  baseURL: E2E_BASE_URL,
  emailAndPassword: { enabled: false },
  plugins: [testUtils()],
});
