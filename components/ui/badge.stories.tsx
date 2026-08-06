import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge } from "./badge";

const meta = {
  component: Badge,
  args: { children: "未確認" },
  tags: ["ai-generated"],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge>default</Badge>
      <Badge variant="secondary">secondary</Badge>
      <Badge variant="outline">outline</Badge>
      <Badge variant="ghost">ghost</Badge>
      <Badge variant="destructive">destructive</Badge>
      <Badge variant="link">link</Badge>
    </div>
  ),
};

/**
 * エントリ本文で「※未確認」の行に付くバッジ。等幅にするのは
 * この製品のマイクロラベルの体裁に合わせるため。実際の使用箇所は
 * components/entry-body.tsx。
 */
export const Unverified: Story = {
  render: () => (
    <p className="text-[15px]">
      硬度が高いと渋みが立つ、と書いている資料が多いが出典が辿れない
      <Badge className="ml-1.5 font-mono" variant="outline">
        未確認
      </Badge>
    </p>
  ),
};

/**
 * 角丸は base クラスの rounded-4xl だが、この配色では --radius が全段階 2px
 * なので丸くならない。upstream のピル型を期待して読むと食い違うので注意。
 */
export const NotAPill: Story = {
  args: { children: "丸くならない" },
};
