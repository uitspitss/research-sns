import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { EntryBody } from "./entry-body";

const meta = {
  component: EntryBody,
  tags: ["ai-generated"],
} satisfies Meta<typeof EntryBody>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    body: [
      "- 水出しと煮出しの差は温度より抽出時間の影響が大きい",
      "- 江戸は井戸水が塩辛い土地が多く、上水道と水売りが併存していた",
      "- 水売りは天秤棒で一荷ずつ運び、価格は距離で決まった",
    ].join("\n"),
  },
};

/** ※未確認 が付いた行はバッジに置き換わる */
export const Unverified: Story = {
  args: {
    body: [
      "- 硬度が高いと渋みが立つ、と書いている資料が多いが出典が辿れない ※未確認",
      "- こちらは裏が取れている",
    ].join("\n"),
  },
  play: async ({ canvas }) => {
    // 「※未確認」の文字は本文から消え、バッジ 1 個だけになる
    await expect(canvas.getAllByText("未確認")).toHaveLength(1);
    await expect(canvas.queryByText(/※未確認/)).not.toBeInTheDocument();
  },
};

/** 記号なしの行もそのまま項目として並ぶ */
export const WithoutBullets: Story = {
  args: { body: "記号を付けずに書いた行\nもう一行" },
};

export const Empty: Story = {
  args: { body: "" },
};
