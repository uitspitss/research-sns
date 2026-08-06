import { describe, expect, it } from "vitest";
import { buildSearchText } from "./search-text";

describe("buildSearchText", () => {
  it("title / trigger / path / body / twist を1つの文字列にまとめる", () => {
    const text = buildSearchText({
      title: "始点 → 終点",
      trigger: "きっかけ",
      path: ["経由A", "経由B"],
      body: "- 本文",
      twist: "ねじれ",
    });

    expect(text).toContain("始点 → 終点");
    expect(text).toContain("きっかけ");
    expect(text).toContain("経由A");
    expect(text).toContain("経由B");
    expect(text).toContain("- 本文");
    expect(text).toContain("ねじれ");
  });

  it("null の任意項目を含めても壊れない", () => {
    const text = buildSearchText({
      title: "タイトル",
      trigger: null,
      path: [],
      body: "本文",
      twist: null,
    });

    expect(text).toContain("タイトル");
    expect(text).toContain("本文");
    expect(text).not.toContain("null");
  });

  it("経路の語が連結されず、区切られて含まれる", () => {
    // trigram 検索なので "経由A経由B" のように繋がると
    // 実在しない語がヒットしてしまう
    const text = buildSearchText({
      title: "t",
      trigger: null,
      path: ["赤", "青"],
      body: "b",
      twist: null,
    });

    expect(text).not.toContain("赤青");
  });

  it("前後の余分な空白を残さない", () => {
    const text = buildSearchText({
      title: "タイトル",
      trigger: null,
      path: [],
      body: "本文",
      twist: null,
    });

    expect(text).toBe(text.trim());
  });
});
