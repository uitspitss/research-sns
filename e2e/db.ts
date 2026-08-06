import { drizzle } from "drizzle-orm/node-postgres";
import { E2E_DATABASE_URL } from "./env";

/**
 * E2E 用 DB への直接接続。テストが**自分の前提条件を自分で用意する**ために使う。
 *
 * `@/lib/db` は import 時点で process.env.DATABASE_URL を読むので使えない
 * （静的 import は巻き上げられるため、環境変数を差し替える方式では評価順に依存する）。
 * ここでは接続先を直接渡す。
 *
 * **アサーションにこれを使わないこと。** DB を直接見て確かめるなら、それは
 * E2E ではなく unit で書ける。ここで見るのは画面と API の応答。
 */
export const e2eDb = drizzle(E2E_DATABASE_URL);
