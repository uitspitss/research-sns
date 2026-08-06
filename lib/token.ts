import { and, eq, isNull } from "drizzle-orm";
import { agentToken, user } from "@/db/schema";
import { db } from "./db";

/** トークンは平文で保存しない。照合は sha256 ハッシュで行う。 */
export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Authorization: Bearer <token> から投稿者を引く。無効なら null。
 *
 * これはエージェント（MCP / CLI）用の経路。ブラウザのログインセッション
 * （better-auth）とは別物で、投稿はこちらだけを通る。
 */
export async function authenticate(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const raw = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!raw) return null;

  const rows = await db
    .select({ id: user.id, handle: user.handle, tokenId: agentToken.id })
    .from(agentToken)
    .innerJoin(user, eq(user.id, agentToken.userId))
    .where(and(eq(agentToken.tokenHash, await hashToken(raw)), isNull(agentToken.revokedAt)))
    .limit(1);

  const found = rows[0];
  // handle 未設定のユーザーは投稿先の URL が決まらないので投稿させない
  if (!found?.handle) return null;

  // 最終使用時刻の更新は投稿の成否に影響させない（失敗しても投稿は通す）。
  // ただし握り潰さずログには残す。ここが恒常的に失敗しているとき、
  // /settings の「最終使用」がずっと空のままになり、原因が追えなくなるため。
  void db
    .update(agentToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(agentToken.id, found.tokenId))
    .catch((e: unknown) => {
      console.error("[auth] agent_token.last_used_at の更新に失敗しました", e);
    });

  return { id: found.id, handle: found.handle };
}
