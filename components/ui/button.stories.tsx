import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ExternalLinkIcon, SearchIcon } from "lucide-react";
import { expect } from "storybook/test";
import { Button } from "./button";

const meta = {
  component: Button,
  args: { children: "検索" },
  tags: ["ai-generated"],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * この配色でのバリアント一覧。primary はティール(#0E6B60)、
 * secondary と ghost の面は paper-raise に落ちる。
 */
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button>default</Button>
      <Button variant="outline">outline</Button>
      <Button variant="secondary">secondary</Button>
      <Button variant="ghost">ghost</Button>
      <Button variant="destructive">destructive</Button>
      <Button variant="link">link</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="xs">xs</Button>
      <Button size="sm">sm</Button>
      <Button size="default">default</Button>
      <Button size="lg">lg</Button>
    </div>
  ),
};

/**
 * アイコンは data-icon で位置を指定する。size-4 のようなサイズ指定を
 * 自分で書かないこと（コンポーネント側が面倒を見る）。
 */
export const WithIcon: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button>
        <SearchIcon data-icon="inline-start" />
        検索
      </Button>
      <Button variant="outline">
        出典を開く
        <ExternalLinkIcon data-icon="inline-end" />
      </Button>
      <Button aria-label="検索" size="icon">
        <SearchIcon />
      </Button>
    </div>
  ),
};

/** 送信中に無効化する。settings のフォームがこの状態を使う */
export const Disabled: Story = {
  args: { children: "発行中…", disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button")).toBeDisabled();
  },
};
