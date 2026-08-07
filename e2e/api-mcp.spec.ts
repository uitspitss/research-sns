import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { expect, test } from "@playwright/test";
import { E2E_BASE_URL } from "./env";
import { E2E_AGENT_TOKEN, E2E_ENTRIES, E2E_RATE_LIMITED_TOKEN, E2E_USER } from "./fixture";

/**
 * MCP 経路。REST（api-entries.spec.ts）と同じ postEntry() を通るので、
 * ここで見るのは「MCP のプロトコルの上でその経路が正しく露出しているか」だけ。
 *
 * 生の JSON-RPC を組み立てず公式クライアントを使う。実際のクライアントが通る
 * ハンドシェイクまで含めて確かめたいのと、プロトコルの詳細をこちらで
 * 再実装したくないため。
 */

const TOOLS = {
  search: "research_sns_search_entries",
  get: "research_sns_get_entry",
  post: "research_sns_post_entry",
} as const;

const [fixtureEntry] = E2E_ENTRIES;

async function connect(token?: string): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL("/api/mcp", E2E_BASE_URL), {
    ...(token ? { requestInit: { headers: { authorization: `Bearer ${token}` } } } : {}),
  });
  const client = new Client({ name: "research-sns-e2e", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

/** content の text を1本につなぐ */
const textOf = (result: { content?: unknown }) =>
  ((result.content ?? []) as { type: string; text?: string }[]).map((c) => c.text ?? "").join("\n");

test("認証なしで接続してツール一覧が取れる", async () => {
  const client = await connect();
  try {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([TOOLS.get, TOOLS.post, TOOLS.search].sort());
  } finally {
    await client.close();
  }
});

test("認証なしで検索できる", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({
      name: TOOLS.search,
      arguments: { query: "ベルトコンベア" },
    });

    expect(result.isError).toBeFalsy();
    // **件数で確かめない。** 同じ DB を共有するので実行順と retry で本数が変わる
    const entries = (result.structuredContent as { entries: { slug: string }[] }).entries;
    expect(entries.map((e) => e.slug)).toContain(E2E_ENTRIES[1].slug);
  } finally {
    await client.close();
  }
});

test("認証なしでエントリを本文まで読める", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({
      name: TOOLS.get,
      arguments: { handle: E2E_USER.handle, slug: fixtureEntry.slug },
    });

    expect(result.isError).toBeFalsy();
    const detail = result.structuredContent as {
      title: string;
      body: string;
      twist: string | null;
    };
    expect(detail.title).toBe(fixtureEntry.title);
    // 一覧には出ない本文まで返ること（search との違い）
    expect(detail.body).toBe(fixtureEntry.body);
    expect(detail.twist).toBe(fixtureEntry.twist);
  } finally {
    await client.close();
  }
});

test("無いエントリはツールエラーとして返る", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({
      name: TOOLS.get,
      arguments: { handle: E2E_USER.handle, slug: "9999-99-99-zzzz" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain(TOOLS.search);
  } finally {
    await client.close();
  }
});

test("トークンが無いと投稿だけが弾かれる（接続は通る）", async () => {
  const client = await connect();
  try {
    const result = await client.callTool({
      name: TOOLS.post,
      arguments: { title: "だめ → だめ", body: "- だめ", path: ["だめ", "だめ"] },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("トークン");
  } finally {
    await client.close();
  }
});

test("偽造トークンでは接続そのものが落ちる", async () => {
  // 綴り間違いを「トークンが無い」と混同させないため、ここは 401 にしてある
  await expect(connect("not-a-real-token")).rejects.toThrow();
});

test("path が1要素だと投稿を弾く（REST より厳しい）", async () => {
  const client = await connect(E2E_AGENT_TOKEN);
  try {
    const result = await client.callTool({
      name: TOOLS.post,
      arguments: { title: "経路なし → だめ", body: "- だめ", path: ["ひとつだけ"] },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("path");
  } finally {
    await client.close();
  }
});

test("トークンがあれば投稿でき、投稿したものが検索に出る", async () => {
  const client = await connect(E2E_AGENT_TOKEN);
  try {
    const marker = `mcp-e2e-${Date.now()}`;
    const posted = await client.callTool({
      name: TOOLS.post,
      arguments: {
        title: `MCP からの投稿 → ${marker}`,
        body: `- ${marker} から投げた`,
        path: ["MCP", marker],
        logged_on: "2026-02-01",
      },
    });

    expect(posted.isError).toBeFalsy();
    const created = posted.structuredContent as { url: string; handle: string; slug: string };
    expect(created.handle).toBe(E2E_USER.handle);
    expect(created.url).toContain(`/e/${E2E_USER.handle}/${created.slug}`);

    // 経路のノード名で引けること（buildSearchText を通っている証拠）
    const found = await client.callTool({ name: TOOLS.search, arguments: { query: marker } });
    const entries = (found.structuredContent as { entries: { slug: string }[] }).entries;
    expect(entries.map((e) => e.slug)).toContain(created.slug);
  } finally {
    await client.close();
  }
});

test("レート制限に達したトークンでは投稿できない", async () => {
  const client = await connect(E2E_RATE_LIMITED_TOKEN);
  try {
    const result = await client.callTool({
      name: TOOLS.post,
      arguments: { title: "上限 → 超過", body: "- 通らないはず", path: ["上限", "超過"] },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toContain("レート制限");
  } finally {
    await client.close();
  }
});
