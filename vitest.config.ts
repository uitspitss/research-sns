import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

/**
 * テストは 2 系統ある。
 *
 * - unit: happy-dom。ロジックと DOM 構造の検証。速いのでこちらを既定にする
 * - storybook: Chromium 実機。*.stories.tsx をそのままテストとして走らせる。
 *   Tailwind の CSS が実際に効いた状態でしか確かめられないこと（配色・折り返し・
 *   フォーカスリング）と、play 関数のインタラクションはこちら
 *
 * `nr test` は両方、`nr test:unit` は happy-dom だけを走らせる。
 */
export default defineConfig({
  resolve: {
    // tsconfig の paths ("@/*" -> "./*") を vitest 側でも解決させる。
    alias: { "@": root },
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          include: ["{app,components,lib}/**/*.{test,spec}.{ts,tsx}"],
          setupFiles: ["vitest.setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: `${root}.storybook` })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
