import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "./item";

const meta = {
  component: Item,
  tags: ["ai-generated"],
} satisfies Meta<typeof Item>;

export default meta;
type Story = StoryObj<typeof meta>;

/** settings のトークン一覧がこの形 */
export const TokenRow: Story = {
  render: () => (
    <ItemGroup>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>laptop の Claude Code</ItemTitle>
          <ItemDescription>発行 2026-07-02 / 最終使用 2026-08-04</ItemDescription>
        </ItemContent>
        <ItemActions>
          <Button size="sm" variant="outline">
            失効させる
          </Button>
        </ItemActions>
      </Item>
      <Item className="opacity-60" variant="outline">
        <ItemContent>
          <ItemTitle>失くしたやつ</ItemTitle>
          <ItemDescription>発行 2026-05-01 / 失効 2026-06-01</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const Variants: Story = {
  render: () => (
    <ItemGroup>
      <Item variant="default">
        <ItemContent>
          <ItemTitle>default（枠線なし）</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>outline</ItemTitle>
        </ItemContent>
      </Item>
      <Item variant="muted">
        <ItemContent>
          <ItemTitle>muted</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};

export const WithSeparator: Story = {
  render: () => (
    <ItemGroup>
      <Item>
        <ItemContent>
          <ItemTitle>検証用</ItemTitle>
          <ItemDescription>未使用</ItemDescription>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>CI 用</ItemTitle>
          <ItemDescription>未使用</ItemDescription>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
};
