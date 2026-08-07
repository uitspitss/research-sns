import { mkdir, writeFile } from "node:fs/promises";
import { test as setup } from "@playwright/test";
import { testAuth } from "./auth-instance";
import { E2E_USER, E2E_USER_NO_HANDLE, E2E_USER_RATE_LIMITED } from "./fixture";

/**
 * ログイン済みの状態を1回だけ作り、ファイルに保存する。
 * 各テストは playwright.config.ts の `storageState` からこれを読む。
 *
 * ユーザー自体は e2e/prepare-db.ts が入れてあるので、ここでやるのは
 * 「そのユーザーのセッションを作って Cookie に焼く」ことだけ。
 *
 * 出力先は gitignore してある。**有効なセッション Cookie が入っている。**
 */

const AUTH_DIR = "e2e/.auth";

async function saveStorageState(userId: string, file: string) {
  const ctx = await testAuth.$context;

  // domain は baseURL のホスト名と揃える。ずれると Cookie が送られない
  const cookies = await ctx.test.getCookies({ userId, domain: "localhost" });

  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      {
        // better-auth の TestCookie は expires が「未設定なら undefined」。
        // Playwright は数値必須で、セッション Cookie は -1 を使う
        cookies: cookies.map((c) => ({ ...c, expires: c.expires ?? -1 })),
        origins: [],
      },
      null,
      2,
    ),
  );
}

setup("handle 設定済みのユーザーでログインする", async () => {
  await saveStorageState(E2E_USER.id, `${AUTH_DIR}/user.json`);
});

setup("handle 未設定のユーザーでログインする", async () => {
  await saveStorageState(E2E_USER_NO_HANDLE.id, `${AUTH_DIR}/no-handle.json`);
});

// トークンの発行上限を確かめるための3人目。E2E_USER でやると、同じ人が使う
// 「トークンを発行すると一度だけ平文が表示される」テストを巻き添えで落とす
setup("レート制限済みのユーザーでログインする", async () => {
  await saveStorageState(E2E_USER_RATE_LIMITED.id, `${AUTH_DIR}/rate-limited.json`);
});
