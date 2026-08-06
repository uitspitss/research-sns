import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

const meta = {
  component: Card,
  tags: ["ai-generated"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 設定ページの各セクションがこの形。面は paper-raise、囲みは border ではなく
 * ring-1 ring-foreground/10 なので、罫線 1px よりわずかに淡く出る。
 * CardTitle は font-heading = 明朝。
 */
export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>エージェント用トークン</CardTitle>
        <CardDescription>
          MCP / CLI から POST /api/entries に使うトークンです。発行時に一度だけ表示されます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>発行済みのトークンは 2 本です。</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>ログイン</CardTitle>
        <CardDescription>
          Google でログインすると、handle を取ってトークンを発行できます。
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button>Google でログイン</Button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>handle</CardTitle>
        <CardDescription>公開ページの URL になります。</CardDescription>
        <CardAction>
          <Button size="xs" variant="ghost">
            開く
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>@hoshino</p>
      </CardContent>
    </Card>
  ),
};

/** 余白を一段詰めた版 */
export const Small: Story = {
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>失効済み</CardTitle>
        <CardDescription>2026-06-01 に失効させました。</CardDescription>
      </CardHeader>
    </Card>
  ),
};
