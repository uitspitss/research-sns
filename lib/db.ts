import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

/**
 * 接続先で driver を切り替える。
 * neon のドライバは HTTP エンドポイント越しなので、ローカルの素の Postgres には繋がらない。
 * スキーマ定義は共通なので、呼び出し側はこの差を意識しなくてよい。
 */
const isNeon = /neon\.tech|neon\.build/.test(url);

export const db = isNeon ? drizzleNeon(neon(url), { schema }) : drizzlePg(url, { schema });
