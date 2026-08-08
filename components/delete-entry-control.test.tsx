import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DeleteEntryControl } from "./delete-entry-control";

/**
 * 見ているのは「2段階でないと送信できない」という一点。
 * 削除は取り消せないので、1クリックで飛ぶ形にしていないことを構造で縛る。
 *
 * 実際に押して action が呼ばれるところは storybook 側（実機）に置いた。
 * happy-dom は React 19 の form action の送信までは面倒を見ない。
 */
const props = { slug: "2026-01-05-aa01", action: vi.fn(), pending: false };

const deleteButton = () => screen.queryByRole("button", { name: "この経路を削除" });
const submitButton = () => screen.queryByRole("button", { name: "削除する" });

describe("DeleteEntryControl", () => {
  it("最初は入口のボタンだけで、送信ボタンが存在しない", () => {
    render(<DeleteEntryControl {...props} />);

    expect(deleteButton()).toBeInTheDocument();
    expect(submitButton()).not.toBeInTheDocument();
  });

  it("入口を押すと、取り消せない旨と送信ボタンが出る", () => {
    render(<DeleteEntryControl {...props} />);

    fireEvent.click(deleteButton()!);

    expect(screen.getByText(/元に戻せません/)).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
    // 入口は消える。押す先が2つある状態にしない
    expect(deleteButton()).not.toBeInTheDocument();
  });

  it("送信ボタンは対象の slug を持つ", () => {
    const { container } = render(<DeleteEntryControl {...props} />);

    fireEvent.click(deleteButton()!);

    expect(container.querySelector("input[name='slug']")).toHaveValue(props.slug);
  });

  it("やめると入口に戻り、送信ボタンが消える", () => {
    render(<DeleteEntryControl {...props} />);

    fireEvent.click(deleteButton()!);
    fireEvent.click(screen.getByRole("button", { name: "やめる" }));

    expect(deleteButton()).toBeInTheDocument();
    expect(submitButton()).not.toBeInTheDocument();
  });

  it("送信中はどちらのボタンも押せない", () => {
    render(<DeleteEntryControl {...props} pending />);

    fireEvent.click(deleteButton()!);

    expect(screen.getByRole("button", { name: "削除中…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "やめる" })).toBeDisabled();
  });

  it("エラーは確認に入る前から出す", () => {
    render(<DeleteEntryControl {...props} error="ログインしてください" />);

    expect(screen.getByText("ログインしてください")).toBeInTheDocument();
    expect(deleteButton()).toBeInTheDocument();
  });
});
