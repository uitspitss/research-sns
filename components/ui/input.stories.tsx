import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { Input } from "./input";

const meta = {
  component: Input,
  args: { placeholder: "端点をひとつ思い出せれば足りる", "aria-label": "検索語" },
  tags: ["ai-generated"],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * **upstream から 1 箇所変えている。** bg-transparent ではなく bg-card。
 * この配色では入力欄のような「触れる面」を paper-raise で一段持ち上げるのが
 * 元からの決まりで、透明のままだと紙の地に沈む。
 */
export const Default: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("検索語");
    await expect(getComputedStyle(input).backgroundColor).toBe("rgb(243, 245, 239)");
  },
};

export const WithValue: Story = {
  args: { defaultValue: "麦茶" },
};

/** 検索ページはこの高さで使っている（既定の h-8 だと読み物には詰まる） */
export const Larger: Story = {
  args: { className: "h-9" },
};

/** handle が取られていたときなど。Field 側の data-invalid と対で使う */
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "hoshino" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "hoshino" },
};
