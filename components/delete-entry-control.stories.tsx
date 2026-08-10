import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { DeleteEntryControl } from "./delete-entry-control";

/**
 * 経路の削除。エントリ本体の末尾に、所有者にだけ出る。
 *
 * 送信までを踏むのはここ（実機の Chromium）に置いてある。
 * unit 側（delete-entry-control.test.tsx）は2段階の構造だけを見ている。
 */
const meta = {
  component: DeleteEntryControl,
  args: { slug: "2026-01-05-aa01", action: fn(), pending: false },
  tags: ["ai-generated"],
} satisfies Meta<typeof DeleteEntryControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。押す先は1つだけで、この時点では何も送らない */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "この経路を削除" }));

    await expect(canvas.getByRole("button", { name: "削除する" })).toBeVisible();
    // 確認を出しただけで送信していない
    await expect(args.action).not.toHaveBeenCalled();
  },
};

/** 確認まで踏んで送信する。form action に slug が乗ることを実機で確かめる */
export const Deletes: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "この経路を削除" }));
    await userEvent.click(canvas.getByRole("button", { name: "削除する" }));

    await expect(args.action).toHaveBeenCalledWith(expect.any(FormData));
  },
};

/** 送信中。二重に押せないこと */
export const Pending: Story = {
  args: { pending: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "この経路を削除" }));

    await expect(canvas.getByRole("button", { name: "削除中…" })).toBeDisabled();
  },
};

/** サーバー側で弾かれたとき。確認に入る前から見えている状態 */
export const Failed: Story = {
  args: { error: "ログインしてください" },
};
