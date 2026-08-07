import { queryEntryDetails } from "@/lib/entries";
import { postEntryInputSchema } from "@/lib/entry-input";
import { describePostEntryError, postEntry } from "@/lib/post-entry";
import { authenticate } from "@/lib/token";

/**
 * POST /api/entries
 * Authorization: Bearer <token>
 *
 * 追記のみ。更新も削除もエンドポイントを用意していない。
 * ここに投げたものは全部公開される。
 *
 * 中身は lib/post-entry.ts。この関数は HTTP と業務ロジックの間の変換だけを持つ
 * （MCP の post_entry ツールも同じ postEntry() を通る）。
 */
export async function POST(req: Request) {
  const author = await authenticate(req);
  if (!author) return json({ error: "トークンが無効です" }, 401);

  let b: unknown;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエストが JSON として読めません" }, 400);
  }

  const parsed = postEntryInputSchema.safeParse(b);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? "リクエストの内容が不正です" }, 400);
  }

  const result = await postEntry(parsed.data, author, new URL(req.url).origin);
  if (!result.ok) {
    const message = describePostEntryError(result.error);
    return result.error.code === "rate_limited"
      ? json({ error: message }, 429, { "Retry-After": String(result.error.retryAfterSeconds) })
      : json({ error: message }, 503);
  }

  return json({ url: result.url, handle: result.handle, slug: result.slug }, 201);
}

/** GET /api/entries?handle=&q=&limit=  公開エントリの読み出し。認証不要。 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;

  const rows = await queryEntryDetails({
    handle: p.get("handle") ?? undefined,
    q: p.get("q") ?? undefined,
    // 下限も要る。負数を渡すと Postgres が「LIMIT must not be negative」で落ちて 500 になる
    limit: Math.max(1, Math.min(Number(p.get("limit")) || 20, 100)),
  });

  // 列名は API の契約なので snake_case のまま返す（DB 側は loggedOn）
  const entries = rows.map(({ loggedOn, ...rest }) => ({ ...rest, logged_on: loggedOn }));

  return json({ entries }, 200);
}

function json(body: unknown, status: number, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}
