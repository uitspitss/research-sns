import { z } from "zod";
import { HANDLE_PATTERN, HANDLE_RULE } from "@/lib/handle";
import { QUERY_LIMITS } from "@/lib/limits";

/**
 * `GET /api/entries` のクエリ。
 *
 * **手書きで詰めないこと。** `Math.min(Number(...) || 20, 100)` と書いていたときは
 * `?limit=-5` が素通りして `LIMIT must not be negative` で 500 になっていた。
 * 型変換・範囲・既定値は zod に任せる。
 *
 * route.ts から分けてあるのは、あちらが DB を掴んでいて import すると接続が要るため。
 * ここは純粋なままにして schema.test.ts で直接テストする（MCP 側と同じ構成）。
 */
const entriesQuerySchema = z.object({
  handle: z.string().regex(HANDLE_PATTERN, `handle は${HANDLE_RULE}です`).optional(),
  q: z.string().trim().min(1).max(200).optional(),
  // 壊れた値は既定値に倒す。読み出しなので 400 にする価値がない（従来の挙動でもある）
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(QUERY_LIMITS.rest.max)
    .catch(QUERY_LIMITS.rest.fallback),
});

/**
 * 空文字は「指定なし」として扱う（`?q=` と `?q` を区別しない）。
 * handle の綴り間違いは黙って0件にせずエラーにする。MCP 側と態度を揃えている。
 */
export function parseEntriesQuery(params: URLSearchParams) {
  return entriesQuerySchema.safeParse({
    handle: params.get("handle") || undefined,
    q: params.get("q") || undefined,
    limit: params.get("limit") ?? undefined,
  });
}
