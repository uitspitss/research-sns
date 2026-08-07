import { z } from "zod";
import {
  ENTRY_FIELD_DESCRIPTIONS,
  type Exactly,
  type PostEntryDraft,
  entryFields,
} from "@/lib/entry-input";
import { HANDLE_PATTERN, HANDLE_RULE } from "@/lib/handle";
import { ENTRY_LIMITS, QUERY_LIMITS } from "@/lib/limits";

/**
 * MCP のツールが受け取る入力の形。**エージェントに配る契約**なので、
 * lib ではなく MCP ルートの隣に置く。読み手はエージェントであって我々ではない。
 *
 * route.ts から分けてあるのは、あちらが DB を掴んでいて import すると
 * 接続が要るため。ここは純粋なままにして schema.test.ts で直接テストする。
 *
 * 上限値は lib/limits.ts、共通フィールドは lib/entry-input.ts から読む。
 * REST 側と食い違わせないため、ここには書き写さない。
 */

/* ------------------------------------------------------------------ *
 * MCP だけ REST より厳しくしている点が3つある。いずれも「エントリは不変で、
 * 投げ直しも消去もできない」ことに由来する。黙って直したり捨てたりすると、
 * 間違いに気づけないまま固定されてしまう。
 *
 *   1. path を必須（2要素以上）にする。REST は空配列を通す。
 *      経路が空のエントリは一覧でも本体でも中身が無いのと同じになる。
 *   2. sources の不正な URL を落とさずエラーにする。REST は黙って捨てる。
 *      黙って捨てると、出典を付けたつもりのエントリが出典なしで固定される。
 *   3. 知らないキーを弾く（strictObject）。REST は無視する。
 *      trigger を tigger と綴り間違えたとき、REST では黙って null になる。
 *
 * REST 側の寛容な挙動は互換のためそのまま残してある（lib/entry-input.ts）。
 * ------------------------------------------------------------------ */

export const mcpPostEntryInputSchema = z.strictObject({
  ...entryFields,
  path: z
    .array(
      z
        .string()
        .trim()
        .min(1, "path に空の要素は入れられません")
        .max(ENTRY_LIMITS.pathNode, "path の要素が長すぎます"),
    )
    .min(2, "path は始点と終点を含む経路です。最低2要素にしてください")
    .max(ENTRY_LIMITS.path, "path が長すぎます")
    .describe(ENTRY_FIELD_DESCRIPTIONS.path),
  sources: z
    .array(
      z.url({ protocol: /^https?$/ }).max(ENTRY_LIMITS.sourceUrl, "sources の URL が長すぎます"),
    )
    .max(ENTRY_LIMITS.sources, "sources が多すぎます")
    .default([])
    .describe(ENTRY_FIELD_DESCRIPTIONS.sources),
});

// スキーマにフィールドを足しても postEntry() が黙って捨てないことの番人。
// 何をしているかは lib/entry-input.ts の Exactly を参照
const mcpMatchesDraft: Exactly<z.infer<typeof mcpPostEntryInputSchema>, PostEntryDraft> = true;
void mcpMatchesDraft;

export const searchEntriesInputSchema = z.strictObject({
  query: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .describe("検索語。経路の途中のノード名でも引ける（端点をひとつ思い出せれば足りる）。"),
  handle: handleField().optional().describe("投稿者で絞る。省略すると全員が対象。"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(QUERY_LIMITS.mcp.max)
    .default(QUERY_LIMITS.mcp.fallback)
    .describe("返す件数の上限。"),
});

export const getEntryInputSchema = z.strictObject({
  handle: handleField(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .describe("エントリの slug。検索結果か公開URLからそのまま渡す。形を自分で組み立てないこと。"),
});

function handleField() {
  return z
    .string()
    .regex(HANDLE_PATTERN, `handle は${HANDLE_RULE}です`)
    .describe("投稿者の handle。検索結果か公開URL（/e/{handle}/{slug}）から取る。");
}

/* ------------------------------------------------------------------ *
 * 出力
 * ------------------------------------------------------------------ */

/** 一覧の1件。単体では配らない（詳細と検索結果の土台） */
const entrySummarySchema = z.object({
  handle: z.string().nullable(),
  slug: z.string(),
  title: z.string(),
  trigger: z.string().nullable(),
  path: z.array(z.string()),
  logged_on: z.string(),
  url: z.string(),
});

export const entryDetailSchema = entrySummarySchema.extend({
  body: z.string(),
  twist: z.string().nullable(),
  sources: z.array(z.string()),
});

export const searchEntriesOutputSchema = z.object({
  entries: z.array(entrySummarySchema),
  count: z.number().int(),
});

export const postEntryOutputSchema = z.object({
  url: z.string(),
  handle: z.string(),
  slug: z.string(),
  logged_on: z.string(),
});

export type EntrySummaryOut = z.infer<typeof entrySummarySchema>;
export type EntryDetailOut = z.infer<typeof entryDetailSchema>;
