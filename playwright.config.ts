import { defineConfig, devices } from "@playwright/test";
import { E2E_AUTH_SECRET, E2E_BASE_URL, E2E_DATABASE_URL, E2E_PORT } from "./e2e/env";

/**
 * E2E は「アプリが起動して主要導線が生きている」ことの番人。
 * 仕様の網羅は vitest 側（`nr test`）に置く。境界は CLAUDE.md の「テスト」を参照。
 *
 * DB の準備（migration とデータ投入）は Playwright ではなく `nr test:e2e` の
 * 前段で走る。理由は e2e/prepare-db.ts のコメントに書いてある。
 */
export default defineConfig({
  // vitest の include（{app,components,lib}/**）と食い合わないよう隔離する。
  // 拡張子も分けてある: E2E は *.spec.ts、unit は *.test.ts
  testDir: "./e2e",

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // 同じ DB を見るので並列にしない。件数を数えるテストが他のテストの挿入で落ちる
  workers: 1,

  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],

  use: {
    baseURL: E2E_BASE_URL,
    trace: "on-first-retry",
  },

  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],

  webServer: {
    // `next dev` にしない。初回アクセスのオンデマンドコンパイル待ちが
    // 「要素が見つからない」という形で現れて、原因が追えなくなる。
    //
    // **build もここに含めるのが要点。** `/` は ISR（revalidate 60）なので
    // ビルド時にプリレンダされた HTML がそのまま返る。別の場所で `nr build` すると
    // 開発 DB の内容が焼き込まれ、E2E 用のデータを入れたのにタイムラインには
    // 出てこない、という状態になる。下の env が build と start の両方に効く
    command: "pnpm run build && pnpm run start",

    // `/` は ISR（revalidate 60）なので、ヘルスチェックの結果がキャッシュされる。
    // force-dynamic の /search を叩く。DB まで引くので「アプリと DB が生きている」
    // ことの確認にもなる
    url: `${E2E_BASE_URL}/search`,

    // `next start` は dotenvx 越しに .env を読むが、**既にセットされた変数は
    // 上書きしない**。ここで渡した3つが勝ち、残り（GOOGLE_* など）は .env から入る
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      BETTER_AUTH_SECRET: E2E_AUTH_SECRET,
      BETTER_AUTH_URL: E2E_BASE_URL,
      PORT: E2E_PORT,
    },

    reuseExistingServer: !process.env.CI,
    // build を含むので長めに取る
    timeout: 240_000,
    // 既定の "ignore" だとサーバー側の 500 が完全に握り潰される
    stdout: "pipe",
  },
});
