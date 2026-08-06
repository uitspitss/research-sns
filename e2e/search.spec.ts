import { expect, test } from "@playwright/test";
import { E2E_ENTRIES } from "./fixture";

const [hanabi, sushi] = E2E_ENTRIES;

test("検索語で絞り込める", async ({ page }) => {
  await page.goto("/search");

  // 本文にしか出ない語で引く。search_text が title だけでなく body まで
  // 連結できていないとここで落ちる（buildSearchText の経路の番人）
  await page.getByLabel("検索語").fill("ベルトコンベア");
  await page.getByRole("button", { name: "検索" }).click();

  await expect(page.getByRole("link", { name: sushi.title })).toBeVisible();
  await expect(page.getByRole("link", { name: hanabi.title })).toBeHidden();
});

test("ヒットしないときは空状態を出す", async ({ page }) => {
  await page.goto("/search");

  await page.getByLabel("検索語").fill("該当しないはずの語句xyzzy");
  await page.getByRole("button", { name: "検索" }).click();

  await expect(page.getByText("を含む経路はありません")).toBeVisible();
});
