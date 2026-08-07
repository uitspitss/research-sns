import type { AuthInfo } from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { type EntryDetail, type EntrySummary, findEntry, queryEntries } from "@/lib/entries";
import { describePostEntryError, postEntry } from "@/lib/post-entry";
import { type AuthenticatedAgent, authenticateToken } from "@/lib/token";
import {
  type EntryDetailOut,
  type EntrySummaryOut,
  entryDetailSchema,
  getEntryInputSchema,
  mcpPostEntryInputSchema,
  postEntryOutputSchema,
  searchEntriesInputSchema,
  searchEntriesOutputSchema,
} from "./schema";

/**
 * MCP サーバー。REST（/api/entries）と同じ経路を、MCP クライアントから直接使えるようにしたもの。
 *
 * runtime は書かない（＝ Node のまま）。pg のドライバは edge で動かない。
 *
 * 読み取りの2つは認証不要。投稿だけがトークンを要る。GET /api/entries が
 * 誰でも読めるので、それに揃えている。
 *
 * 入力・出力のスキーマは ./schema.ts。
 */

/** ツール名にサービス名を付ける。他の MCP サーバーと同居したとき get_entry のような名前は衝突する */
const PREFIX = "research_sns";

/** テキスト表現の上限。構造化データ（structuredContent）のほうは削らない */
const CHARACTER_LIMIT = 25_000;

function siteOrigin(): string {
  const url = process.env.BETTER_AUTH_URL;
  // 黙って undefined を URL に埋めると、壊れたリンクが不変のエントリとして残る
  if (!url) throw new Error("BETTER_AUTH_URL is not set");
  return url.replace(/\/$/, "");
}

const entryUrl = (handle: string, slug: string) => `${siteOrigin()}/e/${handle}/${slug}`;

const toSummary = (e: EntrySummary): EntrySummaryOut => ({
  handle: e.handle,
  slug: e.slug,
  title: e.title,
  trigger: e.trigger,
  path: e.path,
  logged_on: e.loggedOn,
  url: entryUrl(e.handle, e.slug),
});

const toDetail = (e: EntryDetail): EntryDetailOut => ({
  ...toSummary(e),
  body: e.body,
  twist: e.twist,
  sources: e.sources,
});

/** 経路は矢印でつなぐ。配列のまま出すより短く、画面の見え方とも揃う */
const formatPath = (path: string[]) => (path.length > 0 ? path.join(" → ") : "（経路なし）");

function formatSummary(e: EntrySummaryOut): string {
  const lines = [
    `## ${e.title}`,
    `- 経路: ${formatPath(e.path)}`,
    `- @${e.handle} / ${e.logged_on}`,
  ];
  if (e.trigger) lines.push(`- きっかけ: ${e.trigger}`);
  lines.push(`- ${e.url}`);
  return lines.join("\n");
}

function formatDetail(e: EntryDetailOut): string {
  const lines = [
    `# ${e.title}`,
    "",
    `経路: ${formatPath(e.path)}`,
    `@${e.handle} / ${e.logged_on}`,
    "",
  ];
  if (e.trigger) lines.push(`きっかけ: ${e.trigger}`, "");
  lines.push(e.body);
  if (e.twist) lines.push("", `ねじれ: ${e.twist}`);
  if (e.sources.length > 0) lines.push("", "出典:", ...e.sources.map((s) => `- ${s}`));
  lines.push("", e.url);
  return lines.join("\n");
}

/** 溢れたぶんは切るが、切ったことと次の手を必ず書く */
function clamp(text: string, hint: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return `${text.slice(0, CHARACTER_LIMIT)}\n\n…（長いため以降を省略しました。${hint}）`;
}

const ok = (text: string, structuredContent: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text }],
  structuredContent,
});

const fail = (text: string) => ({ isError: true, content: [{ type: "text" as const, text }] });

/**
 * **SDK はツールハンドラの例外を全部飲んで、error.message だけをエージェントに返す。**
 * ログは一行も出ないので、ここで出さないと接続断も設定ミスもサーバー側に何も残らない。
 * エージェントには内部の文言を見せず、再試行を促しすぎない文面を返す。
 */
function toolFailed(name: string, error: unknown) {
  console.error(`[mcp] ${name} が失敗しました`, error);
  return fail("サーバー側でエラーが起きました。同じ内容をすぐに投げ直さず、時間をおいてください。");
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      `${PREFIX}_search_entries`,
      {
        title: "調べ物の経路を検索する",
        description: [
          "公開されている調べ物の経路（エントリ）を検索・一覧する。認証は要らない。",
          "",
          "title / trigger / path / body / twist をつないだ文字列に対する部分一致で、日本語もそのまま使える。",
          "結果に本文・ねじれ・出典は含まれない（一覧は要約だけ）。中身を読むには続けて",
          `${PREFIX}_get_entry を呼ぶこと。query を省略すると新着順の一覧になる。`,
        ].join("\n"),
        inputSchema: searchEntriesInputSchema,
        outputSchema: searchEntriesOutputSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ query, handle, limit }) => {
        try {
          const rows = (await queryEntries({ handle, q: query, limit })).map(toSummary);

          if (rows.length === 0) {
            const what = query ? `「${query}」` : "指定の条件";
            return ok(
              `${what}に一致するエントリはありません。語を短くするか、経路の途中のノード名で引き直してください。`,
              { entries: [], count: 0 },
            );
          }

          const text = clamp(
            [`${rows.length} 件見つかりました。`, ...rows.map(formatSummary)].join("\n\n"),
            "limit を下げるか query で絞り込んでください",
          );
          return ok(text, { entries: rows, count: rows.length });
        } catch (e) {
          return toolFailed(`${PREFIX}_search_entries`, e);
        }
      },
    );

    server.registerTool(
      `${PREFIX}_get_entry`,
      {
        title: "エントリを1件読む",
        description: [
          "handle と slug を指定してエントリを本文まで取得する。認証は要らない。",
          "エントリは追記専用で編集も削除もされないので、同じ handle/slug の結果は将来も変わらない。",
        ].join("\n"),
        inputSchema: getEntryInputSchema,
        outputSchema: entryDetailSchema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
      },
      async ({ handle, slug }) => {
        try {
          const found = await findEntry(handle, slug);
          if (!found) {
            return fail(
              `@${handle} の ${slug} は見つかりません。つづりを確認するか、${PREFIX}_search_entries で探し直してください。`,
            );
          }

          const detail = toDetail(found);
          return ok(clamp(formatDetail(detail), "本文は url を開いて読んでください"), detail);
        } catch (e) {
          return toolFailed(`${PREFIX}_get_entry`, e);
        }
      },
    );

    server.registerTool(
      `${PREFIX}_post_entry`,
      {
        title: "調べ物の経路を1件残す",
        description: [
          "調べ物で辿った経路（エントリ）を1件追記する。トークンが要る（/settings で発行する）。",
          "",
          "**投げたものは公開され、あとから編集も削除もできない。** 永久に残る前提で書くこと。",
          "同じ内容を2回投げないこと。失敗したときだけ再試行してよい。",
          "",
          "このサービスの主役は path（経路）で、一覧でも本体でも必ず表示される。",
          "title と body だけのエントリは中身が無いのと同じなので、path は2要素以上を必須にしてある。",
          "各項目の書き方と例は入力スキーマの説明を読むこと（ここには繰り返さない）。",
        ].join("\n"),
        inputSchema: mcpPostEntryInputSchema,
        outputSchema: postEntryOutputSchema,
        annotations: {
          readOnlyHint: false,
          // 追記だけで既存のものを壊さない
          destructiveHint: false,
          // 同じ引数で2回呼べばエントリが2件増える。消せないので、勝手に再試行させない
          idempotentHint: false,
          openWorldHint: false,
        },
      },
      async (draft, ctx) => {
        const agent = agentFrom(ctx.http?.authInfo?.extra);
        if (!agent) {
          return fail(
            "投稿にはトークンが要ります。/settings で発行して、MCP クライアントの Authorization ヘッダに " +
              "`Bearer <token>` として設定してください。",
          );
        }

        try {
          const result = await postEntry(draft, agent, siteOrigin());
          if (!result.ok) return fail(describePostEntryError(result.error));

          const output = {
            url: result.url,
            handle: result.handle,
            slug: result.slug,
            logged_on: result.loggedOn,
          };
          return ok(`投稿しました。\n${result.url}`, output);
        } catch (e) {
          return toolFailed(`${PREFIX}_post_entry`, e);
        }
      },
    );
  },
  { serverInfo: { name: "research-sns", version: "1.0.0" } },
);

/**
 * トークンが無いときは undefined を返して素通りさせる（読み取りの2つは認証不要）。
 * トークンがあるのに引けないときは throw して 401 にする。
 * ここで undefined を返してしまうと、綴りを間違えただけの人に
 * 「トークンがありません」と言うことになって原因が分からなくなる。
 */
async function verifyToken(_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const agent = await authenticateToken(bearerToken);
  if (!agent) throw new Error("invalid agent token");

  return { token: bearerToken, clientId: agent.id, scopes: [], extra: { agent } };
}

/**
 * `AuthInfo.extra` は `Record<string, unknown>` なので、素で書くと無検査キャストになる。
 * 詰める側（verifyToken）と読む側がずれても型検査は通ってしまうため、
 * 取り出しをここ1箇所に閉じて形を確かめる。ずれたら「トークンが要ります」に落ちる。
 */
function agentFrom(extra: Record<string, unknown> | undefined): AuthenticatedAgent | undefined {
  const found = extra?.agent;
  if (!found || typeof found !== "object") return undefined;

  const { id, handle, tokenId } = found as Partial<AuthenticatedAgent>;
  return typeof id === "string" && typeof handle === "string" && typeof tokenId === "string"
    ? { id, handle, tokenId }
    : undefined;
}

const authHandler = withMcpAuth(handler, verifyToken, { required: false });

export { authHandler as GET, authHandler as POST };
