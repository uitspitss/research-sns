import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { EntrySummary } from "@/lib/entries";
import { EntryItem } from "./entry-item";

const base: EntrySummary = {
  slug: "why-the-kettle-sings",
  handle: "hana",
  title: "やかんが鳴る理由",
  trigger: "台所で気になった",
  path: ["やかん", "共鳴"],
  loggedOn: "2026-08-01",
};

describe("EntryItem", () => {
  it("見出しはエントリ本体へのリンクになる", () => {
    render(<EntryItem entry={base} />);

    expect(screen.getByRole("link", { name: base.title })).toHaveAttribute(
      "href",
      "/e/hana/why-the-kettle-sings",
    );
  });

  it("showHandle を落とすと @handle を出さない", () => {
    render(<EntryItem entry={base} showHandle={false} />);

    expect(screen.queryByText("@hana")).not.toBeInTheDocument();
  });

  it("showTrigger を落とすときっかけを出さない", () => {
    render(<EntryItem entry={base} showTrigger={false} />);

    expect(screen.queryByText(base.trigger!)).not.toBeInTheDocument();
  });

  it("trigger が null なら何も出さない", () => {
    render(<EntryItem entry={{ ...base, trigger: null }} />);

    expect(screen.getByRole("link", { name: base.title })).toBeInTheDocument();
    expect(screen.queryByText("台所で気になった")).not.toBeInTheDocument();
  });
});
