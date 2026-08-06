import { eq } from "drizzle-orm";
import { expect, test } from "@playwright/test";
import { user } from "@/db/schema";
import { e2eDb } from "./db";
import { E2E_USER, E2E_USER_NO_HANDLE } from "./fixture";

test.describe("未ログイン", () => {
  // storageState を空にして「Cookie が無い状態」を作る
  test.use({ storageState: { cookies: [], origins: [] } });

  test("ログインカードが出て、投稿経路ではないことが書いてある", async ({ page }) => {
    await page.goto("/settings");

    // shadcn の CardTitle は div なので heading ロールを持たない。
    // 見出しとして取れないのは a11y 上の課題だが、E2E で app 側を変えない
    await expect(page.getByText("ログイン", { exact: true })).toBeVisible();
    await expect(page.getByText("ログインは投稿経路ではありません")).toBeVisible();
    // 未ログインなので handle もトークンも出さない
    await expect(page.getByRole("button", { name: "トークンを発行" })).toBeHidden();
  });
});

test.describe("handle 設定済み", () => {
  test("handle と公開ページの URL が出る", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText(`@${E2E_USER.handle}`)).toBeVisible();
    await expect(page.getByText(`/u/${E2E_USER.handle}`)).toBeVisible();
  });

  test("トークンを発行すると一度だけ平文が表示され、一覧に載る", async ({ page }) => {
    await page.goto("/settings");

    const label = `e2e が発行した ${Date.now()}`;
    await page.getByLabel("ラベル").fill(label);
    await page.getByRole("button", { name: "トークンを発行" }).click();

    await expect(page.getByText("この画面を離れると二度と表示されません")).toBeVisible();
    await expect(page.getByText(label)).toBeVisible();

    // リロードすると平文は消える（サーバは sha256 しか持たない）
    await page.reload();
    await expect(page.getByText("この画面を離れると二度と表示されません")).toBeHidden();
    await expect(page.getByText(label)).toBeVisible();
  });
});

test.describe("handle 未設定", () => {
  test.use({ storageState: "e2e/.auth/no-handle.json" });

  // handle は一度決めると変更できない。下のテストが handle を設定してしまうので、
  // **各テストが自分で前提を作り直す**。これが無いと、retry したときや
  // 実行順が変わったときに「フォームが無い」で落ちる
  test.beforeEach(async () => {
    await e2eDb.update(user).set({ handle: null }).where(eq(user.id, E2E_USER_NO_HANDLE.id));
  });

  test("handle を決めるまでトークンを発行できない", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("先に handle を決めてください")).toBeVisible();
    await expect(page.getByRole("button", { name: "トークンを発行" })).toBeHidden();
  });

  test("handle を設定すると公開ページの URL が決まる", async ({ page }) => {
    await page.goto("/settings");

    const handle = `e2e${Date.now().toString(36)}`;
    await page.getByLabel("handle").fill(handle);
    await page.getByRole("button", { name: "この handle にする" }).click();

    await expect(page.getByText(`/u/${handle}`)).toBeVisible();
    // 一度決めたら変更できないので、フォームは消える
    await expect(page.getByRole("button", { name: "この handle にする" })).toBeHidden();
  });
});
