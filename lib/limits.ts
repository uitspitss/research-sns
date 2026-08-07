/**
 * この製品が課している上限。
 *
 * **このファイルは何も import しない。** 値を1つ読みたいだけの側が DB 接続まで
 * 背負わされないようにするため。実際、以前 `lib/token.ts` に上限を置いていたら、
 * 定数を読むだけの E2E が「DATABASE_URL is not set」で落ちた。
 * ここに置いてある限り、E2E からもブラウザ側からも素直に import できる。
 *
 * 上限を「決めている」のはここだけ。使う側（スキーマ・レート制限・トークン発行）は
 * 必ずここから読むこと。書き写すと必ず片方が古くなる。
 */

/** エントリ1件の各項目の上限。REST と MCP のスキーマが共有する */
export const ENTRY_LIMITS = {
  title: 200,
  trigger: 500,
  body: 20000,
  twist: 1000,
  /** path / sources は要素数と1要素の長さの両方を縛る。片方だけだと素通りする */
  path: 20,
  pathNode: 80,
  sources: 30,
  sourceUrl: 2048,
} as const;

/**
 * 1ユーザーが同時に持てる有効なトークンの数。
 * **DB の制約ではなくアプリで見ている**（`app/settings/actions.ts` の issueToken）。
 *
 * レート制限はユーザー単位で数えるので、これは濫用対策ではない（何本持っていても
 * 投稿できる量は変わらない）。増え続ける行と、漏れたときの後始末の手間を抑える
 * ための衛生上の上限。端末ごとに分けても普通は使い切らない値にしてある。
 */
export const MAX_ACTIVE_TOKENS = 20;

export type RateLimitScope = "burst" | "sustained";

/**
 * 投稿のレート制限。**ユーザー単位**で数える（集計は lib/rate-limit.ts）。
 *
 * トークン単位にしてはいけない。`/settings` で何本でも発行できるので、
 * トークンで数えると上限に当たるたびに発行し直せば枠が戻ってしまい、
 * 「上限に達したら新しいトークンを取って続ける」エージェントには効かなくなる。
 * 濫用と事故の境界はユーザーであってトークンではない。
 *
 * 二段にしてあるのは、止めたいものが2種類あるため。
 * burst はリトライループの書き間違いのような「暴走」を数秒で止めるための窓。
 * sustained は機械的な一括流し込みを止めるための窓。
 * 片方だけだと、緩すぎて暴走を見逃すか、厳しすぎて普通に使えないかのどちらかになる。
 *
 * エントリは不変で削除経路が無いので、抜けた分は消せない。取りこぼすより
 * 少し厳しいほうを選んでいる。
 */
export const POST_RATE_LIMITS = {
  burst: { windowMs: 5 * 60_000, limit: 5, label: "5分に5件" },
  sustained: { windowMs: 24 * 60 * 60_000, limit: 30, label: "24時間に30件" },
} as const satisfies Record<RateLimitScope, { windowMs: number; limit: number; label: string }>;
