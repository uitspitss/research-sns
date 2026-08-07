import { desc, eq } from "drizzle-orm";
import { entry } from "@/db/schema";
import { db } from "./db";
import { POST_RATE_LIMITS, type RateLimitScope } from "./limits";
import type { AuthenticatedAgent } from "./token";

/**
 * ある窓の「上限番目に新しい投稿」の時刻。まだ上限に達していなければ null。
 * これが窓の中に残っていれば、その窓は埋まっている。
 */
export type RateLimitWindowState = { scope: RateLimitScope; boundaryAt: Date | null };

export type RateLimitDecision =
  | { allowed: true }
  | {
      allowed: false;
      scope: RateLimitScope;
      limit: number;
      windowMs: number;
      retryAfterSeconds: number;
    };

/**
 * 窓の状態から可否を決める。時刻を引数で取る純粋関数（DB と時計から切り離してテストするため）。
 * 渡された順に見て、最初に当たった窓を返す。
 */
export function rateLimitVerdict(states: RateLimitWindowState[], now: Date): RateLimitDecision {
  for (const { scope, boundaryAt } of states) {
    if (!boundaryAt) continue;

    const { windowMs, limit } = POST_RATE_LIMITS[scope];
    const elapsed = now.getTime() - boundaryAt.getTime();
    if (elapsed >= windowMs) continue;

    return {
      allowed: false,
      scope,
      limit,
      windowMs,
      // 切り上げる。0 を返すと「今すぐどうぞ」の意味になり、まだ通らないのに再試行させてしまう
      retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000),
    };
  }

  return { allowed: true };
}

/**
 * ユーザー単位のレート制限を引く（トークン単位にしない理由は lib/limits.ts）。
 *
 * COUNT を取らず「上限番目に新しい行」の時刻だけを引く。
 * entry_user_created_idx のレンジスキャン1回で済み、件数が増えても重くならない。
 *
 * **これは逐次の投稿にしか効かない。** 判定と insert が別クエリなので、
 * Promise.all で同時に投げられると全員が同じ「まだ空いている」を読み、
 * 超過は並列度ぶんになる（「数件」では収まらない）。
 *
 * ロックで閉じないのは、本番と開発でドライバが違うため。neon-http は
 * transaction() を持たず（throw する）、代わりに batch() を持つ。node-postgres は逆。
 * どちらかに寄せると実装が2本立てになり、**本番側の経路だけ E2E で一度も踏めなくなる**。
 * 塞ぎ方が未検証になるほうが、防ぎたい事故より危ない。
 *
 * 止めたい本命（リトライループの書き間違い）は逐次なので、1件目が入った時点から
 * 後続には見える。並列で超過させるには Promise.all を意図的に書く必要があり、
 * それは事故ではない。そこまで塞ぐならカウンタテーブル（固定窓）に作り替えることになり、
 * スライディング窓と entry.agent_token_id による追跡を捨てる話になる。
 */
export async function checkPostRateLimit(
  // 文字列ではなく `{ id }` を取る。**tokenId を渡す事故を型で止めるため。**
  // 取り違えても両方 string なので、通ってしまうと 0 件が返って制限が黙って無効になる
  agent: Pick<AuthenticatedAgent, "id">,
): Promise<RateLimitDecision> {
  const userId = agent.id;
  const scopes = Object.keys(POST_RATE_LIMITS) as RateLimitScope[];

  const states = await Promise.all(
    scopes.map(async (scope): Promise<RateLimitWindowState> => {
      const rows = await db
        .select({ createdAt: entry.createdAt })
        .from(entry)
        .where(eq(entry.userId, userId))
        .orderBy(desc(entry.createdAt))
        .limit(1)
        .offset(POST_RATE_LIMITS[scope].limit - 1);

      return { scope, boundaryAt: rows[0]?.createdAt ?? null };
    }),
  );

  return rateLimitVerdict(states, new Date());
}
