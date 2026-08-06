import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PathTrail } from "./path-trail";

describe("PathTrail", () => {
  it("4 ノード以下ならすべて表示する", () => {
    render(<PathTrail path={["a", "b", "c"]} />);

    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("b")).toBeInTheDocument();
    expect(screen.getByText("c")).toBeInTheDocument();
  });

  it("5 ノード以上は中間を畳んで本数だけ示す", () => {
    render(<PathTrail path={["a", "b", "c", "d", "e"]} />);

    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByText("+3")).toBeInTheDocument();
    expect(screen.getByText("e")).toBeInTheDocument();
    expect(screen.queryByText("c")).not.toBeInTheDocument();
  });

  it("large 指定なら畳まずすべて表示する", () => {
    render(<PathTrail path={["a", "b", "c", "d", "e"]} large />);

    expect(screen.getByText("c")).toBeInTheDocument();
    expect(screen.queryByText("+3")).not.toBeInTheDocument();
  });

  it("空の経路なら何も描画しない", () => {
    const { container } = render(<PathTrail path={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});
