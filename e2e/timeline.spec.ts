import { expect, test } from "@playwright/test";
import { E2E_ENTRIES, E2E_USER } from "./fixture";

const [first] = E2E_ENTRIES;

test("タイムラインから経路の本体へ移動できる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: first.title }).click();

  await expect(page).toHaveURL(new RegExp(`/e/${E2E_USER.handle}/${first.slug}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(first.title);

  // 経路そのものがこの製品の中身なので、本体では省略されずに全ノードが出る
  // （一覧では中間が "+N" に畳まれる）
  await Promise.all(
    first.path.map((node) => expect(page.getByText(node, { exact: true })).toBeVisible()),
  );
  await expect(page.getByText(`+${first.path.length - 2}`, { exact: true })).toBeHidden();
});

test("タイムラインの @handle からユーザーページへ移動できる", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("link", { name: `@${E2E_USER.handle}` })
    .first()
    .click();

  await expect(page).toHaveURL(new RegExp(`/u/${E2E_USER.handle}$`));

  // **件数で確かめない。** api-entries.spec.ts が同じユーザーで投稿するので、
  // 実行順や retry で本数が変わる。固定データが並んでいることだけを見る
  await Promise.all(
    E2E_ENTRIES.map((e) => expect(page.getByRole("link", { name: e.title })).toBeVisible()),
  );
});

test("ヘッダーから設定へ移動できる", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "設定" }).click();

  await expect(page).toHaveURL(/\/settings$/);
});

test("存在しないエントリは 404 になる", async ({ page }) => {
  const res = await page.goto(`/e/${E2E_USER.handle}/9999-99-99-zzzz`);

  expect(res?.status()).toBe(404);
});
