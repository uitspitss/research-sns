import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "./alert";
import { Button } from "./button";

const meta = {
  component: Alert,
  tags: ["ai-generated"],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Alert>
      <AlertTitle>handle は変更できません</AlertTitle>
      <AlertDescription>エントリの URL が既に外に出ているためです。</AlertDescription>
    </Alert>
  ),
};

/**
 * **ローカルで足したバリアント。** upstream の shadcn には無い。
 * 左に 1 本アクセントの罫を立てる引用ブロックで、エントリの「ねじれ」と
 * settings の注意書きで使っている。元の globals.css の .twist の置き換え。
 */
export const Accent: Story = {
  render: () => (
    <Alert className="px-[18px] py-4" variant="accent">
      <AlertTitle className="font-mono text-[10.5px] tracking-[0.12em] text-primary">
        ねじれ
      </AlertTitle>
      <AlertDescription className="text-foreground">
        「軟水がおいしい」は近代の言説で、江戸期は水そのものが商品だった
      </AlertDescription>
    </Alert>
  ),
  play: async ({ canvas }) => {
    const alert = canvas.getByRole("alert");
    // 左罫だけが primary。ここが崩れたら accent バリアントの意味がなくなる
    await expect(getComputedStyle(alert).borderLeftColor).toBe("rgb(14, 107, 96)");
    await expect(getComputedStyle(alert).borderLeftWidth).toBe("2px");
  },
};

/** 失効に失敗したときなど。TokenList が使う */
export const Destructive: Story = {
  render: () => (
    <Alert variant="destructive">
      <AlertTitle>失効させられませんでした</AlertTitle>
      <AlertDescription>ログインしてください</AlertDescription>
    </Alert>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Alert>
      <AlertTitle>トークンが未使用のままです</AlertTitle>
      <AlertDescription>発行から 30 日間このトークンでの投稿がありません。</AlertDescription>
      <AlertAction>
        <Button size="xs" variant="outline">
          失効
        </Button>
      </AlertAction>
    </Alert>
  ),
};
