import { expect, test } from "@playwright/test";
import { E2E_AGENT_TOKEN, E2E_RATE_LIMITED_TOKEN, E2E_REVOKED_TOKEN, E2E_USER } from "./fixture";

/**
 * 書き込みの入口のうち REST 側。Web に投稿フォームは無いので、ここと
 * MCP（api-mcp.spec.ts）が落ちると誰も投稿できなくなる。
 * 中身はどちらも lib/post-entry.ts の postEntry() を通る。
 */

test("Bearer トークンで投稿できる", async ({ request }) => {
  const res = await request.post("/api/entries", {
    headers: { Authorization: `Bearer ${E2E_AGENT_TOKEN}` },
    data: {
      title: "E2E の投稿 → 確認",
      body: "- e2e から投げた",
      path: ["E2E", "確認"],
      logged_on: "2026-02-01",
    },
  });

  expect(res.status()).toBe(201);
  const json = await res.json();
  expect(json.handle).toBe(E2E_USER.handle);
  expect(json.url).toContain(`/e/${E2E_USER.handle}/${json.slug}`);

  // 投稿したものが読み出し API に出る（エントリ本体のページは ISR なのでここでは見ない）。
  // **件数で確かめない** — retry すると前の試行の分が残っていて落ちる
  const list = await request.get(`/api/entries?handle=${E2E_USER.handle}`);
  expect(list.status()).toBe(200);
  const slugs = ((await list.json()).entries as { slug: string }[]).map((e) => e.slug);
  expect(slugs).toContain(json.slug);
});

test("トークンが無いと 401", async ({ request }) => {
  const res = await request.post("/api/entries", {
    data: { title: "だめ", body: "- だめ" },
  });

  expect(res.status()).toBe(401);
});

test("偽造トークンでは 401", async ({ request }) => {
  const res = await request.post("/api/entries", {
    headers: { Authorization: "Bearer not-a-real-token" },
    data: { title: "だめ", body: "- だめ" },
  });

  expect(res.status()).toBe(401);
});

// 漏れたトークンを止める手段は失効しかない。ここが黙って壊れると気づけない
test("失効済みトークンでは 401", async ({ request }) => {
  const res = await request.post("/api/entries", {
    headers: { Authorization: `Bearer ${E2E_REVOKED_TOKEN}` },
    data: { title: "だめ", body: "- だめ" },
  });

  expect(res.status()).toBe(401);
});

test("title が無いと 400", async ({ request }) => {
  const res = await request.post("/api/entries", {
    headers: { Authorization: `Bearer ${E2E_AGENT_TOKEN}` },
    data: { body: "- title が無い" },
  });

  expect(res.status()).toBe(400);
});

// レート制限は MCP だけでなくこちらにも効く（判定は lib/post-entry.ts に1本化してある）。
// 上限に達した状態は prepare-db.ts が専用トークンで作る。ここでは投稿しないので retry しても結果が変わらない
test("レート制限に達したトークンでは 429 と Retry-After が返る", async ({ request }) => {
  const res = await request.post("/api/entries", {
    headers: { Authorization: `Bearer ${E2E_RATE_LIMITED_TOKEN}` },
    data: { title: "上限 → 超過", body: "- 通らないはず" },
  });

  expect(res.status()).toBe(429);
  expect(Number(res.headers()["retry-after"])).toBeGreaterThan(0);
  expect((await res.json()).error).toContain("レート制限");
});
