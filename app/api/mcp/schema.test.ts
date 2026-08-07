import { describe, expect, it } from "vitest";
import { ENTRY_LIMITS } from "@/lib/limits";
import { getEntryInputSchema, mcpPostEntryInputSchema, searchEntriesInputSchema } from "./schema";

const minimal = { title: "麦茶 → 江戸の水売り", body: "- 調べた" };
const withPath = { ...minimal, path: ["麦茶の作り方", "江戸の水売り"] };

describe("mcpPostEntryInputSchema（REST より厳しくしている3点）", () => {
  it("path が2要素以上あれば通る", () => {
    expect(mcpPostEntryInputSchema.parse(withPath).path).toEqual(withPath.path);
  });

  it("1. path が無い / 1要素だと弾く（経路がないエントリを作らせない）", () => {
    expect(mcpPostEntryInputSchema.safeParse(minimal).success).toBe(false);
    expect(mcpPostEntryInputSchema.safeParse({ ...minimal, path: ["麦茶"] }).success).toBe(false);
    expect(mcpPostEntryInputSchema.safeParse({ ...minimal, path: [] }).success).toBe(false);
  });

  it("2. sources は落とさず弾く（不変なので黙って捨てない）", () => {
    expect(
      mcpPostEntryInputSchema.safeParse({ ...withPath, sources: ["ftp://example.com/b"] }).success,
    ).toBe(false);
    expect(mcpPostEntryInputSchema.safeParse({ ...withPath, sources: ["https://"] }).success).toBe(
      false,
    );
    expect(
      mcpPostEntryInputSchema.parse({ ...withPath, sources: ["https://example.com/a"] }).sources,
    ).toEqual(["https://example.com/a"]);
  });

  it("3. 知らないキーを弾く（綴り間違いを黙って無視しない）", () => {
    expect(mcpPostEntryInputSchema.safeParse({ ...withPath, tigger: "typo" }).success).toBe(false);
  });

  it("上限と出力の形は REST と揃っている（共通フィールドを使っているため）", () => {
    const parsed = mcpPostEntryInputSchema.parse({ ...withPath, trigger: "  なぜ  " });
    expect(parsed.trigger).toBe("なぜ");
    expect(parsed.twist).toBeNull();
    expect(parsed.sources).toEqual([]);
    expect(
      mcpPostEntryInputSchema.safeParse({ ...withPath, title: "あ".repeat(ENTRY_LIMITS.title + 1) })
        .success,
    ).toBe(false);
  });
});

describe("読み取り側のスキーマ", () => {
  it("search は全部省略できる（新着順の一覧になる）", () => {
    expect(searchEntriesInputSchema.parse({})).toEqual({ limit: 20 });
  });

  it("search の limit は 1〜50", () => {
    expect(searchEntriesInputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(searchEntriesInputSchema.safeParse({ limit: 51 }).success).toBe(false);
    expect(searchEntriesInputSchema.parse({ limit: 50 }).limit).toBe(50);
  });

  it("handle の形を検査する（存在しない handle で無駄に引かせない）", () => {
    expect(getEntryInputSchema.safeParse({ handle: "Ueno", slug: "x" }).success).toBe(false);
    expect(getEntryInputSchema.safeParse({ handle: "a", slug: "x" }).success).toBe(false);
    expect(getEntryInputSchema.parse({ handle: "e2etester", slug: "2026-01-05-aa01" }).slug).toBe(
      "2026-01-05-aa01",
    );
  });

  it("知らないキーを弾く", () => {
    expect(searchEntriesInputSchema.safeParse({ q: "麦茶" }).success).toBe(false);
    expect(getEntryInputSchema.safeParse({ handle: "a_b", slug: "x", extra: 1 }).success).toBe(
      false,
    );
  });
});
