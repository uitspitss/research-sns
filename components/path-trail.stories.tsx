import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { PathTrail } from "./path-trail";

const meta = {
  component: PathTrail,
  tags: ["ai-generated"],
} satisfies Meta<typeof PathTrail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 4 ノード以下はそのまま全部出る */
export const Short: Story = {
  args: { path: ["水出し麦茶", "軟水と硬水", "江戸の上水道"] },
};

/** 5 ノード以上は中間を畳んで本数だけ示す */
export const Collapsed: Story = {
  args: { path: ["QWERTY", "Sholes の特許", "活字アームの絡まり", "電信オペレータ説", "受信効率"] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("+3")).toBeVisible();
    await expect(canvas.queryByText("活字アームの絡まり")).not.toBeInTheDocument();
  },
};

/** エントリ本体では畳まずに全部出す */
export const Large: Story = {
  args: { ...Collapsed.args, large: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("活字アームの絡まり")).toBeVisible();
    await expect(canvas.queryByText("+3")).not.toBeInTheDocument();
  },
};

/**
 * 折り返しの確認。660px の桁に対して長い経路がどう折り返すかは
 * 実 CSS が効いていないと分からないので、ここは実機ブラウザで見る価値がある。
 */
export const Wrapping: Story = {
  args: {
    large: true,
    path: [
      "やかんが鳴る",
      "ヘルムホルツ共鳴",
      "気柱の固有振動",
      "沸騰の気泡径",
      "笛吹きケトルの構造",
      "二枚板の間隙",
    ],
  },
};

/** 経路が空なら何も描かない */
export const Empty: Story = {
  args: { path: [] },
};

/**
 * この配色が実際に読み込まれているかの確認。
 * ノードの枠線は --trail (#A8C4BE)。Tailwind が効いていなければ落ちる。
 */
export const CssCheck: Story = {
  args: { path: ["水出し麦茶"] },
  play: async ({ canvas }) => {
    const node = canvas.getByText("水出し麦茶");
    await expect(getComputedStyle(node).borderColor).toBe("rgb(168, 196, 190)");
    await expect(getComputedStyle(node).borderRadius).toBe("2px");
    await expect(getComputedStyle(node).color).toBe("rgb(14, 107, 96)");
  },
};
