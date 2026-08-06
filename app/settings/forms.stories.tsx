import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked } from "storybook/test";
// 👇 Storybook では __mocks__/actions.js に差し替わる（.storybook/main.ts を参照）
import { claimHandle, issueToken, revokeToken } from "./actions";
import { HandleForm, TokenList, TokenForm } from "./forms";

/**
 * 設定画面のフォーム。エラー表示・発行直後のトークン表示は
 * 実際に Google でログインしないと到達できない状態なので、
 * ここで固定して見られるようにしておく。
 */
const meta = {
  component: HandleForm,
  tags: ["ai-generated"],
} satisfies Meta<typeof HandleForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Handle: Story = {
  async beforeEach() {
    mocked(claimHandle).mockResolvedValue({});
  },
};

/** 取られている handle を送ったとき */
export const HandleTaken: Story = {
  async beforeEach() {
    mocked(claimHandle).mockResolvedValue({ error: "@hoshino はすでに使われています" });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("handle"), "hoshino");
    await userEvent.click(canvas.getByRole("button", { name: "この handle にする" }));

    const error = await canvas.findByText("@hoshino はすでに使われています");
    await expect(error).toBeVisible();
    // FieldError は role="alert"。読み上げに乗ることまで確かめる
    await expect(error).toHaveAttribute("role", "alert");
    await expect(canvas.getByLabelText("handle")).toHaveAttribute("aria-invalid", "true");
  },
};

export const Token: StoryObj<typeof TokenForm> = {
  render: () => <TokenForm />,
  async beforeEach() {
    mocked(issueToken).mockResolvedValue({});
  },
};

/** 発行直後。この画面を離れると二度と出ない平文が一度だけ出る */
export const TokenIssued: StoryObj<typeof TokenForm> = {
  render: () => <TokenForm />,
  async beforeEach() {
    mocked(issueToken).mockResolvedValue({
      issuedToken: "rsns_3f9a1c7d24b8e05f6a1d9c8b7e4f20a3",
    });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("ラベル"), "laptop の Claude Code");
    await userEvent.click(canvas.getByRole("button", { name: "トークンを発行" }));

    await expect(await canvas.findByText("rsns_3f9a1c7d24b8e05f6a1d9c8b7e4f20a3")).toBeVisible();
  },
};

const tokens = [
  {
    id: "tok-1",
    label: "laptop の Claude Code",
    createdAt: new Date("2026-07-02T09:00:00Z"),
    lastUsedAt: new Date("2026-08-04T22:13:00Z"),
    revokedAt: null,
  },
  {
    id: "tok-2",
    label: "検証用",
    createdAt: new Date("2026-06-11T04:20:00Z"),
    lastUsedAt: null,
    revokedAt: null,
  },
  {
    id: "tok-3",
    label: "失くしたやつ",
    createdAt: new Date("2026-05-01T00:00:00Z"),
    lastUsedAt: new Date("2026-05-30T12:00:00Z"),
    revokedAt: new Date("2026-06-01T00:00:00Z"),
  },
];

export const Tokens: StoryObj<typeof TokenList> = {
  render: () => <TokenList tokens={tokens} />,
  async beforeEach() {
    mocked(revokeToken).mockResolvedValue({});
  },
  play: async ({ canvas }) => {
    // 失効済みの行には「失効させる」を出さない
    await expect(canvas.getAllByRole("button", { name: "失効させる" })).toHaveLength(2);
    await expect(canvas.getByText(/失効 2026-06-01/)).toBeVisible();
    await expect(canvas.getByText(/未使用/)).toBeVisible();
  },
};

export const TokensEmpty: StoryObj<typeof TokenList> = {
  render: () => <TokenList tokens={[]} />,
};

/** 失効に失敗したとき（他人のトークン ID を投げた、接続が切れた等） */
export const RevokeFailed: StoryObj<typeof TokenList> = {
  render: () => <TokenList tokens={tokens} />,
  async beforeEach() {
    mocked(revokeToken).mockResolvedValue({ error: "ログインしてください" });
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole("button", { name: "失効させる" })[0]);

    await expect(await canvas.findByText("失効させられませんでした")).toBeVisible();
  },
};
