import { describe, expect, it } from "vitest";
import { postEntryInputSchema, resolveLoggedOn } from "./entry-input";
import { ENTRY_LIMITS } from "./limits";

const minimal = { title: "麦茶 → 江戸の水売り", body: "- 調べた" };

describe("postEntryInputSchema（REST の入口。既存の寛容な挙動を保つ）", () => {
  it("title と body だけで通る", () => {
    const parsed = postEntryInputSchema.parse(minimal);
    expect(parsed.title).toBe(minimal.title);
    expect(parsed.path).toEqual([]);
    expect(parsed.sources).toEqual([]);
    expect(parsed.trigger).toBeNull();
    expect(parsed.twist).toBeNull();
  });

  it("title / body が空なら弾く", () => {
    expect(postEntryInputSchema.safeParse({ ...minimal, title: "  " }).success).toBe(false);
    expect(postEntryInputSchema.safeParse({ ...minimal, body: "" }).success).toBe(false);
    expect(postEntryInputSchema.safeParse({ body: "- x" }).success).toBe(false);
    expect(postEntryInputSchema.safeParse({ title: "x" }).success).toBe(false);
  });

  it("長さの上限を超えるものを弾く", () => {
    const over = (key: keyof typeof ENTRY_LIMITS, n: number) =>
      postEntryInputSchema.safeParse({ ...minimal, [key]: "あ".repeat(n) }).success;

    expect(over("title", ENTRY_LIMITS.title)).toBe(true);
    expect(over("title", ENTRY_LIMITS.title + 1)).toBe(false);
    expect(over("body", ENTRY_LIMITS.body + 1)).toBe(false);
    expect(over("trigger", ENTRY_LIMITS.trigger + 1)).toBe(false);
    expect(over("twist", ENTRY_LIMITS.twist + 1)).toBe(false);
  });

  it("trigger / twist は空文字なら null にする", () => {
    const parsed = postEntryInputSchema.parse({ ...minimal, trigger: "   ", twist: "" });
    expect(parsed.trigger).toBeNull();
    expect(parsed.twist).toBeNull();
  });

  it("path は空要素を落として上限で切る", () => {
    const parsed = postEntryInputSchema.parse({
      ...minimal,
      path: ["  麦茶  ", "", "   ", "水売り"],
    });
    expect(parsed.path).toEqual(["麦茶", "水売り"]);

    const many = postEntryInputSchema.parse({
      ...minimal,
      path: Array.from({ length: ENTRY_LIMITS.path + 5 }, (_, i) => `n${i}`),
    });
    expect(many.path).toHaveLength(ENTRY_LIMITS.path);
  });

  it("sources は http(s) 以外を黙って落とす（REST の既存挙動）", () => {
    const parsed = postEntryInputSchema.parse({
      ...minimal,
      sources: [
        "https://example.com/a",
        "ftp://example.com/b",
        "javascript:alert(1)",
        "http://x.test",
      ],
    });
    expect(parsed.sources).toEqual(["https://example.com/a", "http://x.test"]);
  });

  it("logged_on は YYYY-MM-DD だけを受ける", () => {
    expect(postEntryInputSchema.parse({ ...minimal, logged_on: "2026-02-01" }).logged_on).toBe(
      "2026-02-01",
    );
    expect(postEntryInputSchema.safeParse({ ...minimal, logged_on: "2026/02/01" }).success).toBe(
      false,
    );
    expect(postEntryInputSchema.safeParse({ ...minimal, logged_on: "今日" }).success).toBe(false);
  });

  // 形式だけ見ていると、実在しない日付が date 列まで届いて Postgres の 22008 になる。
  // それは unique 違反ではないので insertWithUniqueSlug が投げ直し、400 で返すべきものが
  // 500 に化ける。**入る前に弾く**
  it("logged_on は実在する日付だけを受ける", () => {
    const at = (d: string) => postEntryInputSchema.safeParse({ ...minimal, logged_on: d }).success;

    expect(at("2026-02-31")).toBe(false);
    expect(at("2026-13-45")).toBe(false);
    expect(at("0000-00-00")).toBe(false);
    // うるう年は通す / 通さない
    expect(at("2024-02-29")).toBe(true);
    expect(at("2026-02-29")).toBe(false);
  });

  it("path / sources が配列でなければ弾く（旧実装は黙って空配列にしていた）", () => {
    expect(postEntryInputSchema.safeParse({ ...minimal, path: "麦茶" }).success).toBe(false);
    expect(postEntryInputSchema.safeParse({ ...minimal, sources: 1 }).success).toBe(false);
  });

  // 要素数だけ縛っても、1要素が無制限だと素通りする。エントリは消せないので入る前に止める
  it("path / sources は1要素の長さも縛る", () => {
    const node = (n: number) =>
      postEntryInputSchema.safeParse({ ...minimal, path: ["あ".repeat(n)] });
    expect(node(ENTRY_LIMITS.pathNode).success).toBe(true);
    expect(node(ENTRY_LIMITS.pathNode + 1).success).toBe(false);

    const url = (n: number) =>
      postEntryInputSchema.safeParse({ ...minimal, sources: [`https://x.test/${"a".repeat(n)}`] });
    expect(url(ENTRY_LIMITS.sourceUrl).success).toBe(false);
    expect(url(10).success).toBe(true);
  });
});

describe("resolveLoggedOn", () => {
  it("指定があればそれを使う", () => {
    expect(resolveLoggedOn("2026-02-01", new Date("2026-08-08T12:00:00Z"))).toBe("2026-02-01");
  });

  it("省略時は実行時刻の日付にする", () => {
    expect(resolveLoggedOn(undefined, new Date("2026-08-08T12:00:00Z"))).toBe("2026-08-08");
  });
});
