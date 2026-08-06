import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import type { EntrySummary } from "@/lib/entries";
import { EntryItem } from "./entry-item";

const entry: EntrySummary = {
  slug: "2026-07-14-a1b2",
  handle: "hoshino",
  title: "麦茶の作り方 → 江戸の水売り",
  trigger: "水出しと煮出しで麦茶の味が違う理由を調べていた",
  path: ["水出し麦茶", "軟水と硬水", "江戸の上水道", "水売りの天秤棒"],
  loggedOn: "2026-07-14",
};

const meta = {
  component: EntryItem,
  args: { entry },
  tags: ["ai-generated"],
} satisfies Meta<typeof EntryItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** タイムラインでの見え方 */
export const Timeline: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: entry.title })).toHaveAttribute(
      "href",
      "/e/hoshino/2026-07-14-a1b2",
    );
  },
};

/** ユーザーページ。@handle は自明なので出さない */
export const WithoutHandle: Story = {
  args: { showHandle: false },
};

/** 検索結果。密度を上げるためきっかけを畳む */
export const WithoutTrigger: Story = {
  args: { showTrigger: false },
};

/** きっかけが未入力のエントリ */
export const NoTrigger: Story = {
  args: { entry: { ...entry, trigger: null } },
};

/** 長い題と長い経路。660px の桁でどう折り返すか */
export const LongTitle: Story = {
  args: {
    entry: {
      ...entry,
      title: "やかんが鳴る理由を辿ったら笛吹きケトルの二枚板の間隙にたどり着いた話",
      path: ["やかんが鳴る", "ヘルムホルツ共鳴", "気柱の固有振動", "沸騰の気泡径", "笛吹きケトル"],
    },
  },
};
