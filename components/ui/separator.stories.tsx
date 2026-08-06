import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Separator } from "./separator";

const meta = {
  component: Separator,
  tags: ["ai-generated"],
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 色は --border（#CBD2C7 = 元の rule）。エントリの区切りは
 * この製品では border-b で引いていて Separator は使っていないが、
 * Field と Item が内部で使っている。
 */
export const Horizontal: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <p>水出しと煮出しの差は温度より抽出時間の影響が大きい</p>
      <Separator />
      <p>江戸は井戸水が塩辛い土地が多く、上水道と水売りが併存していた</p>
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex h-8 items-center gap-4">
      <span className="font-mono text-xs text-muted-foreground">@hoshino</span>
      <Separator orientation="vertical" />
      <span className="font-mono text-xs text-muted-foreground">2026-07-14</span>
    </div>
  ),
};
