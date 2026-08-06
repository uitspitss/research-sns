import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/nextjs-vite";

const here = dirname(fileURLToPath(import.meta.url));
const serverActions = resolve(here, "../app/settings/actions");
const serverActionsMock = resolve(here, "../app/settings/__mocks__/actions.js");

/**
 * app/settings/actions.ts は "use server" で lib/db（pg）と better-auth を掴んでいる。
 * ブラウザに持ち込むと `Buffer is not defined` で落ちるので、解決の段でモックに差し替える。
 *
 * `sb.mock()` を使っていないのは、あれだと forms.tsx から張られた `./actions` の
 * 推移的な import までは捕まえられず、実体が評価されてしまうため（確認済み）。
 * resolve を横取りすれば dev サーバーでも vitest でも同じように効く。
 */
function mockServerActions() {
  return {
    name: "research-sns:mock-server-actions",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || !source.startsWith(".")) return null;
      return resolve(dirname(importer), source) === serverActions ? serverActionsMock : null;
    },
  };
}

const config: StorybookConfig = {
  // ストーリーは対象と同じ場所に置く（components/path-trail.stories.tsx のように）。
  // components/ui/** も対象。vendored ではあるが「ソースは自分たちのもの」が
  // shadcn の前提で、この配色でどう出るかは upstream のドキュメントには無い。
  stories: ["../components/**/*.stories.tsx", "../app/**/*.stories.tsx"],
  addons: ["@storybook/addon-vitest", "@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: "@storybook/nextjs-vite",
  viteFinal(vite) {
    vite.plugins ??= [];
    vite.plugins.push(mockServerActions());

    // 実行中に最適化が走るとページがリロードされ、テストが取り違えて落ちる。
    // ストーリーからしか使わない依存は先に固定しておく。
    vite.optimizeDeps ??= {};
    vite.optimizeDeps.include = [...(vite.optimizeDeps.include ?? []), "lucide-react"];
    return vite;
  },
};

export default config;
