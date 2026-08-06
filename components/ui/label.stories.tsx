import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  component: Label,
  args: { children: "handle" },
  tags: ["ai-generated"],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * 単体で使うことはほぼ無く、FieldLabel の実体としてフォームから使われる。
 * htmlFor で紐付いていれば、ラベルをクリックして入力欄に入る。
 */
export const WithInput: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <Label htmlFor="handle-label">handle</Label>
      <Input id="handle-label" placeholder="yourname" />
    </div>
  ),
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByText("handle"));
    await expect(canvas.getByPlaceholderText("yourname")).toHaveFocus();
  },
};

/** 親の Field が data-disabled のとき薄くなる */
export const Disabled: Story = {
  render: () => (
    <div className="group flex flex-col gap-2" data-disabled="true">
      <Label htmlFor="handle-disabled-label">handle</Label>
      <Input disabled id="handle-disabled-label" defaultValue="hoshino" />
    </div>
  ),
};
