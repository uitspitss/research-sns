import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EntryBody } from "./entry-body";

const items = () => screen.getAllByRole("listitem").map((li) => li.textContent);

describe("EntryBody", () => {
  it("行頭の - を落として 1 行 1 項目にする", () => {
    render(<EntryBody body={"- 一つ目\n- 二つ目"} />);

    expect(items()).toEqual(["一つ目", "二つ目"]);
  });

  it("行頭の * も箇条書きとして扱う", () => {
    render(<EntryBody body="* 星でも通る" />);

    expect(items()).toEqual(["星でも通る"]);
  });

  it("記号のない行もそのまま項目にする", () => {
    render(<EntryBody body="記号なしの行" />);

    expect(items()).toEqual(["記号なしの行"]);
  });

  it("空行と前後の空白を落とす", () => {
    render(<EntryBody body={"\n  - 前後に空白  \n\n\n- 二つ目\n  \n"} />);

    expect(items()).toEqual(["前後に空白", "二つ目"]);
  });

  it("※未確認 を本文から外して未確認バッジにする", () => {
    render(<EntryBody body="- 出典が辿れない ※未確認" />);

    expect(screen.getByText("未確認")).toBeInTheDocument();
    expect(items()).toEqual(["出典が辿れない未確認"]);
  });

  it("※未確認 が無い行にはバッジを出さない", () => {
    render(<EntryBody body="- 確認済みの行" />);

    expect(screen.queryByText("未確認")).not.toBeInTheDocument();
  });

  it("※未確認 が付くのはその行だけ", () => {
    render(<EntryBody body={"- 未確認の行 ※未確認\n- 確認済みの行"} />);

    expect(screen.getAllByText("未確認")).toHaveLength(1);
  });

  it("本文が空なら項目を出さない", () => {
    render(<EntryBody body={"   \n\n  "} />);

    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
