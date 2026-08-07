import { z } from "zod";
import { ENTRY_LIMITS } from "./limits";

/**
 * エントリ投稿の入力スキーマ。
 *
 * **このファイルは DB を掴まない。** MCP 側のスキーマ（app/api/mcp/schema.ts）が
 * ここのフィールドを組み替えて使うので、import しただけで接続が要るようになると困る。
 * 保存そのものは lib/post-entry.ts。
 *
 * 上限値はここに書かない。lib/limits.ts から読む。
 */

/* ------------------------------------------------------------------ *
 * 共通フィールド
 *
 * REST（POST /api/entries）と MCP（post_entry）が共有する。説明文（describe）は
 * MCP のツール定義で JSON Schema に焼かれてエージェントに配られるので、
 * 「何をどう書いてほしいか」をここに書いておく。
 * ------------------------------------------------------------------ */

export const entryFields = {
  title: z
    .string()
    .trim()
    .min(1, "title は必須です")
    .max(ENTRY_LIMITS.title, "title が長すぎます")
    .describe(
      "「始点 → 終点」の形にする。調べ始めたものと辿り着いた先を矢印でつなぐ。" +
        "例: '麦茶の作り方 → 江戸の水売り'。終点だけの見出しにしない。",
    ),

  body: z
    .string()
    .trim()
    .min(1, "body は必須です")
    .max(ENTRY_LIMITS.body, "body が長すぎます")
    .describe(
      "調べた内容の箇条書き。各行を '- ' で始める。表示側が解釈するのは行頭の '-' '*' と " +
        "文中の '※未確認' だけで、完全な markdown ではない。裏が取れていない主張には " +
        "'※未確認' を付けるとバッジになる。",
    ),

  trigger: z
    .string()
    .trim()
    .max(ENTRY_LIMITS.trigger, "trigger が長すぎます")
    .nullish()
    .transform((v) => v || null)
    .describe(
      "きっかけ。何をしていて疑問が湧いたかを一文で。例: '水出しと煮出しで麦茶の味が違う理由を調べていた'",
    ),

  twist: z
    .string()
    .trim()
    .max(ENTRY_LIMITS.twist, "twist が長すぎます")
    .nullish()
    .transform((v) => v || null)
    .describe(
      "ねじれ。調べる前の通念と結論のギャップを一文で。省略可。" +
        "例: '「軟水がおいしい」は近代の言説で、江戸期は水そのものが商品だった'",
    ),

  logged_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "logged_on は YYYY-MM-DD 形式にしてください")
    .optional()
    .describe(
      "調べた日（YYYY-MM-DD）。省略すると実行日。過去の分を後から記録するときだけ指定する。",
    ),
} as const;

/** path / sources の説明文。REST 側では使わないが、定義がばらけないようここに置く */
export const ENTRY_FIELD_DESCRIPTIONS = {
  path:
    "経路。一覧でも本体でも必ず表示される、このサービスの主役。title の始点から終点までを " +
    "実際に辿った順に3〜6個のノードへ分解する。" +
    "例: ['水出し麦茶','軟水と硬水','江戸の上水道','水売りの天秤棒']",
  sources: "参照した URL（http/https のみ）。'※未確認' を付けた主張があるならできるだけ添える。",
} as const;

/**
 * REST（POST /api/entries）の入口。壊れた要素は落として続行する（従来の挙動）。
 *
 * MCP 側はこれより厳しい。違いと理由は app/api/mcp/schema.ts を参照。
 */
export const postEntryInputSchema = z.object({
  ...entryFields,
  path: z
    .array(z.string().trim().max(ENTRY_LIMITS.pathNode, "path の要素が長すぎます"))
    .default([])
    .transform((v) => v.filter((s) => s !== "").slice(0, ENTRY_LIMITS.path)),
  sources: z
    .array(z.string().trim().max(ENTRY_LIMITS.sourceUrl, "sources の URL が長すぎます"))
    .default([])
    .transform((v) => v.filter((s) => /^https?:\/\//.test(s)).slice(0, ENTRY_LIMITS.sources)),
});

/** 検証済みの入力。REST・MCP どちらのスキーマもこの形に落ちる */
export type PostEntryDraft = {
  title: string;
  body: string;
  trigger: string | null;
  twist: string | null;
  path: string[];
  sources: string[];
  logged_on?: string | undefined;
};

export function resolveLoggedOn(loggedOn: string | undefined, now: Date): string {
  return loggedOn ?? now.toISOString().slice(0, 10);
}
