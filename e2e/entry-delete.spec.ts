import { expect, test } from "@playwright/test";
import { entry } from "@/db/schema";
import { buildSearchText } from "@/lib/search-text";
import { e2eDb } from "./db";
import { E2E_ENTRIES, E2E_RATE_LIMITED_TOKEN, E2E_USER, E2E_USER_RATE_LIMITED } from "./fixture";

/**
 * 削除は本人のブラウザセッションからだけ。REST も MCP も削除を持たない。
 *
 * **消す対象はテストごとに自分で作る。** E2E_ENTRIES を消すと他のテスト
 * （timeline / search / api-entries）が巻き添えで落ちるし、retry で二度目が無くなる。
 * 投稿 API 経由にしないのは、E2E_USER のレート制限の枠を食うため。
 */
const DELETE_BUTTON = "この経路を削除";

/** 出し分けが決まったことの印。これを待たずに assert すると、壊れていても通る */
const slot = "[data-slot='delete-entry']";

async function insertDisposableEntry(slug: string) {
  const title = `使い捨ての経路 ${slug} → 削除`;
  const path = ["使い捨て", "削除"];
  const body = "- 削除の E2E が作って消す";

  await e2eDb.insert(entry).values({
    userId: E2E_USER.id,
    // **createdAt を明示する。** 省略すると now になり、E2E_USER の burst 窓
    // （5分に5件）を1件消費する。このテストが途中で落ちると行が残ったまま
    // retry でもう1件積まれ、投稿するテストが巻き添えで 429 になる
    createdAt: new Date(Date.now() - 60 * 60_000),
    slug,
    title,
    trigger: null,
    path,
    body,
    twist: null,
    sources: [],
    loggedOn: "2026-02-01",
    // 生成カラムではないので挿入時に確定させる（db/schema.ts のコメント参照）
    searchText: buildSearchText({ title, trigger: null, path, body, twist: null }),
  });

  return { slug, title };
}

/**
 * **消えたことを読み取り経路ごとに見る。** 削除は行を消さず `deleted_at` を入れるだけなので、
 * `lib/entries.ts` の `visible` を1箇所でも通し忘れると、消したはずのものがそこから漏れる。
 * 経路を足したらここにも1本足すこと。
 */
test("自分の経路を削除すると、どの読み取り経路からも消える", async ({ page, request }) => {
  const { slug, title } = await insertDisposableEntry(`2026-02-01-d${Date.now().toString(36)}`);
  const url = `/e/${E2E_USER.handle}/${slug}`;

  // 消す前に見えていることを確かめておく。**force-dynamic の経路で見る**のが要点で、
  // ISR のページだと「まだ焼かれていないだけ」と区別が付かない
  await page.goto(`/search?q=${encodeURIComponent(slug)}`); // searchEntries
  await expect(page.getByRole("link", { name: title })).toBeVisible();

  await page.goto(url); // findEntry
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  // 1回目は確認が出るだけ。ここで消えたら2段階になっていない
  await page.getByRole("button", { name: DELETE_BUTTON }).click();
  await expect(page.getByText(/元に戻せません/)).toBeVisible();
  await page.getByRole("button", { name: "削除する" }).click();

  // 消したあとは自分のページへ送る
  await expect(page).toHaveURL(new RegExp(`/u/${E2E_USER.handle}$`));
  await expect(page.getByRole("link", { name: title })).toBeHidden(); // listEntriesByHandle

  await page.goto("/"); // listRecentEntries（ISR。削除が revalidatePath している）
  await expect(page.getByRole("link", { name: title })).toBeHidden();

  await page.goto(`/search?q=${encodeURIComponent(slug)}`); // searchEntries
  await expect(page.getByRole("link", { name: title })).toBeHidden();

  const res = await page.goto(url); // findEntry
  expect(res?.status()).toBe(404);

  // queryEntryDetails。MCP の読み取り2つは queryEntries / findEntry を通るが、
  // 絞り込みは entryFilters を共有しているのでここで一緒に見張れている
  const list = await request.get(`/api/entries?q=${encodeURIComponent(slug)}`);
  expect(list.status()).toBe(200);
  expect((await list.json()).entries).toEqual([]);
});

test("他人の経路には削除の入口が出ない", async ({ page }) => {
  // レート制限の埋め草は E2E_USER_RATE_LIMITED のもの。prepare-db.ts が入れている
  await page.goto(`/e/${E2E_USER_RATE_LIMITED.handle}/2026-01-01-f000`);

  // 「まだ来ていない」ではなく「他人だと判定した」ことを確かめる
  await expect(page.locator(slot)).toHaveAttribute("data-owned", "false");
  await expect(page.getByRole("button", { name: DELETE_BUTTON })).toBeHidden();
});

/**
 * **削除でレート制限の枠が戻らないことの番人。**
 *
 * 物理削除に戻すとここが落ちる。`prepare-db.ts` はこのユーザーに sustained の上限
 * ちょうど（30件）を入れてあるので、1件消して枠が戻るなら29件になって投稿が通る。
 * 履歴が残っていれば30件のままで 429 のまま。**1件だけ消すのが効き目の要点。**
 */
test.describe("削除してもレート制限は戻らない", () => {
  test.use({ storageState: "e2e/.auth/rate-limited.json" });

  test("上限ちょうどのユーザーが1件消しても、まだ投稿できない", async ({ page, request }, info) => {
    // retry のたびに別の1件を選ぶ。前の試行で消したものは削除ボタンが出ない
    const slug = `2026-01-01-f${String(info.retry).padStart(3, "0")}`;

    await page.goto(`/e/${E2E_USER_RATE_LIMITED.handle}/${slug}`);
    await page.getByRole("button", { name: DELETE_BUTTON }).click();
    await page.getByRole("button", { name: "削除する" }).click();
    await expect(page).toHaveURL(new RegExp(`/u/${E2E_USER_RATE_LIMITED.handle}$`));

    const res = await request.post("/api/entries", {
      headers: { Authorization: `Bearer ${E2E_RATE_LIMITED_TOKEN}` },
      data: { title: "消して枠を空けた → はずだった", body: "- 通らないはず" },
    });

    expect(res.status()).toBe(429);
  });
});

test.describe("未ログイン", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("削除の入口が出ない", async ({ page }) => {
    const [first] = E2E_ENTRIES;

    await page.goto(`/e/${E2E_USER.handle}/${first.slug}`);

    await expect(page.locator(slot)).toHaveAttribute("data-owned", "false");
    await expect(page.getByRole("button", { name: DELETE_BUTTON })).toBeHidden();
  });
});
