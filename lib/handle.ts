export const HANDLE_RULE = "英小文字・数字・アンダースコアの2〜20文字";

/**
 * handle の形。**書き写さないこと。**
 * 値を検証する側（validateHandle）と、契約として配る側（API のクエリ、MCP のツール定義）が
 * 別々に持つと必ずずれる。
 */
export const HANDLE_PATTERN = /^[a-z0-9_]{2,20}$/;

/**
 * ルーティングと衝突する名前は取らせない。
 * `/search` や `/settings` が個人ページに食われると復旧できないため。
 */
const RESERVED = new Set(["api", "e", "u", "search", "settings", "auth", "login", "logout"]);

export type HandleResult = { ok: true; handle: string } | { ok: false; error: string };

export function validateHandle(input: unknown): HandleResult {
  if (typeof input !== "string") {
    return { ok: false, error: `handle は${HANDLE_RULE}にしてください` };
  }

  const handle = input.trim();

  if (!HANDLE_PATTERN.test(handle)) {
    return { ok: false, error: `handle は${HANDLE_RULE}にしてください` };
  }

  if (RESERVED.has(handle)) {
    return { ok: false, error: `@${handle} は予約されていて使えません` };
  }

  return { ok: true, handle };
}
