import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "./empty";
import { Button } from "./button";

const meta = {
  component: Empty,
  tags: ["ai-generated"],
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

/** タイムラインに 1 本も経路が無いとき */
export const Timeline: Story = {
  render: () => (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyTitle>まだ経路がありません</EmptyTitle>
        <EmptyDescription>
          スキルから <code>POST /api/entries</code> を投げると、ここに並びます。
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

/** 検索して 0 件だったとき */
export const NoResults: Story = {
  render: () => (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyTitle>「軟水」を含む経路はありません</EmptyTitle>
        <EmptyDescription>別の端点で試してみてください。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  ),
};

/** Card の中に置く小さい版。settings のトークン一覧が空のとき */
export const Compact: Story = {
  render: () => (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyTitle>発行済みのトークンはありません</EmptyTitle>
      </EmptyHeader>
    </Empty>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Empty className="py-14">
      <EmptyHeader>
        <EmptyTitle>先に handle を決めてください</EmptyTitle>
        <EmptyDescription>handle が無いとトークンを発行できません。</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline">設定を開く</Button>
      </EmptyContent>
    </Empty>
  ),
};
