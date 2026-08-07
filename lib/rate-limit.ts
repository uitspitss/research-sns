import { desc, eq } from "drizzle-orm";
import { entry } from "@/db/schema";
import { db } from "./db";
import { POST_RATE_LIMITS, type RateLimitScope } from "./limits";

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
 * 同時リクエストが両方とも窓をすり抜けることはありうる。数件のオーバーシュートに
 * 実害は無いので、行ロックは取らない。
 */
export async function checkPostRateLimit(userId: string): Promise<RateLimitDecision> {
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
