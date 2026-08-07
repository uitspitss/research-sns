import { entry } from "@/db/schema";
import { db } from "./db";
import { isUniqueViolation } from "./db-error";
import { type PostEntryDraft, resolveLoggedOn } from "./entry-input";
import { POST_RATE_LIMITS, type RateLimitScope } from "./limits";
import { checkPostRateLimit } from "./rate-limit";
import { buildSearchText } from "./search-text";
import { insertWithUniqueSlug, newSlug } from "./slug";
import type { AuthenticatedAgent } from "./token";

export type PostEntryError =
  | {
      code: "rate_limited";
      scope: RateLimitScope;
      limit: number;
      windowMs: number;
      retryAfterSeconds: number;
    }
  | { code: "slug_exhausted" };

export type PostEntryResult =
  | { ok: true; url: string; handle: string; slug: string; loggedOn: string }
  | { ok: false; error: PostEntryError };

/**
 * エントリを1件追記する。トランスポート（REST / MCP）に依存しない唯一の書き込み経路。
 * **3つ目の入口を足すときも必ずここを通すこと。** レート制限がここにあるので、
 * 迂回する経路を作ると制限の抜け道になる。
 *
 * 検証は呼び出し側の責務（lib/entry-input.ts と app/api/mcp/schema.ts）。
 * ここは検証済みの入力に対する業務規則だけを持つ。
 *
 * origin は呼び出し側が渡す。REST はリクエストの URL から、MCP は
 * BETTER_AUTH_URL から取る。ここはどちら由来かを知らない。
 */
export async function postEntry(
  draft: PostEntryDraft,
  agent: AuthenticatedAgent,
  origin: string,
): Promise<PostEntryResult> {
  // トークンではなくユーザーで数える（理由は lib/limits.ts のコメント）
  const limit = await checkPostRateLimit(agent.id);
  if (!limit.allowed) {
    return {
      ok: false,
      error: {
        code: "rate_limited",
        scope: limit.scope,
        limit: limit.limit,
        windowMs: limit.windowMs,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
    };
  }

  const loggedOn = resolveLoggedOn(draft.logged_on, new Date());
  // 生成カラムにできないので挿入時に確定させる（db/schema.ts のコメント参照）
  const searchText = buildSearchText(draft);

  // 同じユーザーが同じ日に投稿を重ねると低確率で slug が衝突し、
  // unique(user_id, slug) に当たる。黙って落とさず、作り直して入れ直す（lib/slug.ts）
  const slug = await insertWithUniqueSlug(
    () => newSlug(loggedOn),
    (candidate) =>
      db.insert(entry).values({
        userId: agent.id,
        agentTokenId: agent.tokenId,
        slug: candidate,
        title: draft.title,
        trigger: draft.trigger,
        path: draft.path,
        body: draft.body,
        twist: draft.twist,
        sources: draft.sources,
        loggedOn,
        searchText,
      }),
    (e) => isUniqueViolation(e, "entry_user_slug_key"),
  );

  if (!slug) return { ok: false, error: { code: "slug_exhausted" } };

  return {
    ok: true,
    url: `${origin}/e/${agent.handle}/${slug}`,
    handle: agent.handle,
    slug,
    loggedOn,
  };
}

/** REST の {error} と MCP のツールエラー、どちらの文面にも使う */
export function describePostEntryError(error: PostEntryError): string {
  if (error.code === "slug_exhausted") {
    return "slug が生成できませんでした。少し時間をおいて再試行してください";
  }

  const { label } = POST_RATE_LIMITS[error.scope];
  return `投稿のレート制限（${label}）に達しました。あと約${formatDuration(error.retryAfterSeconds)}後に再試行してください`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`;

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes}分`;

  return `${Math.ceil(minutes / 60)}時間`;
}
