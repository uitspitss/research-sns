import { and, desc, eq, ilike } from "drizzle-orm";
import { entry, user } from "@/db/schema";
import { isUniqueViolation } from "@/lib/db-error";
import { authenticate } from "@/lib/token";
import { buildSearchText } from "@/lib/search-text";
import { db } from "@/lib/db";

const MAX = { title: 200, trigger: 500, body: 20000, twist: 1000, path: 20, sources: 30 };

/**
 * POST /api/entries
 * Authorization: Bearer <token>
 *
 * 追記のみ。更新も削除もエンドポイントを用意していない。
 * ここに投げたものは全部公開される。
 */
export async function POST(req: Request) {
  const author = await authenticate(req);
  if (!author) return json({ error: "トークンが無効です" }, 401);

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return json({ error: "リクエストが JSON として読めません" }, 400);
  }

  const title = str(b.title);
  const body = str(b.body);
  if (!title) return json({ error: "title は必須です" }, 400);
  if (!body) return json({ error: "body は必須です" }, 400);
  if (title.length > MAX.title) return json({ error: "title が長すぎます" }, 400);
  if (body.length > MAX.body) return json({ error: "body が長すぎます" }, 400);

  const path = strArray(b.path).slice(0, MAX.path);
  const sources = strArray(b.sources)
    .filter((s) => /^https?:\/\//.test(s))
    .slice(0, MAX.sources);

  const loggedOn = str(b.logged_on) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(loggedOn)) {
    return json({ error: "logged_on は YYYY-MM-DD 形式にしてください" }, 400);
  }

  const trigger = str(b.trigger)?.slice(0, MAX.trigger) || null;
  const twist = str(b.twist)?.slice(0, MAX.twist) || null;
  const searchText = buildSearchText({ title, trigger, path, body, twist });

  // slug は「日付 + ランダム4桁」。同じユーザーが同じ日に投稿を重ねると
  // 低確率で衝突し、unique(user_id, slug) に当たる。
  // 黙って 500 を返さず、別の suffix で入れ直す。
  let slug: string | undefined;
  for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
    const candidate = `${loggedOn}-${randomSuffix()}`;
    try {
      // 再試行は前の試行が失敗して初めて意味を持つので、並列化できない
      // eslint-disable-next-line no-await-in-loop
      await db.insert(entry).values({
        userId: author.id,
        slug: candidate,
        title,
        trigger,
        path,
        body,
        twist,
        sources,
        loggedOn,
        // 生成カラムにできないので挿入時に確定させる（db/schema.ts のコメント参照）
        searchText,
      });
      slug = candidate;
      break;
    } catch (e) {
      // slug 衝突以外（接続断・制約違反の別種）は握り潰さず投げ直す
      if (!isUniqueViolation(e, "entry_user_slug_key")) throw e;
    }
  }

  if (!slug) {
    return json({ error: "slug が生成できませんでした。少し時間をおいて再試行してください" }, 503);
  }

  const origin = new URL(req.url).origin;
  return json({ url: `${origin}/e/${author.handle}/${slug}`, handle: author.handle, slug }, 201);
}

const SLUG_ATTEMPTS = 5;

// 見出しが日本語なので slug には使わない。日付 + ランダムにする。
const randomSuffix = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");

/** GET /api/entries?handle=&q=&limit=  公開エントリの読み出し。認証不要。 */
export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const limit = Math.min(Number(p.get("limit")) || 20, 100);
  const handle = p.get("handle");
  const q = p.get("q");

  const filters = [
    handle ? eq(user.handle, handle) : undefined,
    q ? ilike(entry.searchText, `%${q}%`) : undefined,
  ].filter((f) => f !== undefined);

  const rows = await db
    .select({
      slug: entry.slug,
      handle: user.handle,
      title: entry.title,
      trigger: entry.trigger,
      path: entry.path,
      body: entry.body,
      twist: entry.twist,
      sources: entry.sources,
      logged_on: entry.loggedOn,
    })
    .from(entry)
    .innerJoin(user, eq(user.id, entry.userId))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(entry.createdAt))
    .limit(limit);

  return json({ entries: rows }, 200);
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const strArray = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
