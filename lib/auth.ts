import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import * as schema from "@/db/schema";
import { db } from "./db";

/**
 * ブラウザのログインは **投稿経路ではない**。
 *
 * 投稿は `POST /api/entries` と MCP（`/api/mcp`）の Bearer トークンだけを通る。
 * Google ログインは (1) handle を取る際のスパム対策のゲート、
 * (2) エージェント用トークンの発行・失効、の2つだけを担う。
 * したがって Web に投稿フォームは無いまま。
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),

  // パスワードは持たない。認証は Google に委ねる（自前のパスワード保管を避ける）
  emailAndPassword: { enabled: false },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  user: {
    additionalFields: {
      /**
       * 公開ハンドル。Google からは取れないので初期値は null。
       * /settings で本人が一度だけ決める。
       * クライアントから直接書かせない（重複と形式の検証をサーバー側で行うため）。
       */
      handle: { type: "string", required: false, input: false },
    },
  },

  // Server Action / route handler から Set-Cookie を返せるようにする（Next.js 用）
  plugins: [nextCookies()],
});
