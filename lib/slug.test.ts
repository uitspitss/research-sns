import { describe, expect, it } from "vitest";
import { SLUG_ATTEMPTS, insertWithUniqueSlug, newSlug } from "./slug";

/** insert が投げるものを「衝突」と見なすかどうかだけを差し替える */
const collision = new Error("duplicate key value violates unique constraint");
const isCollision = (e: unknown) => e === collision;

describe("newSlug", () => {
  it("日付 + ランダム4桁hex の形になる", () => {
    expect(newSlug("2026-02-01")).toMatch(/^2026-02-01-[0-9a-f]{4}$/);
  });

  it("呼ぶたびに変わる", () => {
    const slugs = new Set(Array.from({ length: 50 }, () => newSlug("2026-02-01")));
    // 4桁hex を50個。全部同じ値になる確率は無視できる
    expect(slugs.size).toBeGreaterThan(1);
  });
});

describe("insertWithUniqueSlug", () => {
  it("1回で入れば、使った slug を返す", async () => {
    const tried: string[] = [];

    const slug = await insertWithUniqueSlug(
      () => "2026-02-01-aaaa",
      async (s) => {
        tried.push(s);
      },
      isCollision,
    );

    expect(slug).toBe("2026-02-01-aaaa");
    expect(tried).toEqual(["2026-02-01-aaaa"]);
  });

  // 実物の DB では同じユーザー・同じ日・同じ4桁hex が要るので約1/65536。
  // E2E では踏めないため、ここでしか確かめられない
  it("衝突したら別の slug を作り直して入れ直す", async () => {
    const tried: string[] = [];
    let attempt = 0;

    const slug = await insertWithUniqueSlug(
      () => `slug-${attempt}`,
      async (s) => {
        tried.push(s);
        attempt++;
        if (tried.length < 3) throw collision;
      },
      isCollision,
    );

    expect(slug).toBe("slug-2");
    // 使い回さず、毎回作り直していること
    expect(tried).toEqual(["slug-0", "slug-1", "slug-2"]);
  });

  it("衝突以外のエラーは握り潰さず投げ直す", async () => {
    const other = new Error("connection terminated unexpectedly");

    await expect(
      insertWithUniqueSlug(
        () => "2026-02-01-aaaa",
        async () => {
          throw other;
        },
        isCollision,
      ),
    ).rejects.toBe(other);
  });

  it("上限まで衝突したら null を返し、それ以上は試さない", async () => {
    let calls = 0;

    const slug = await insertWithUniqueSlug(
      () => "2026-02-01-aaaa",
      async () => {
        calls++;
        throw collision;
      },
      isCollision,
    );

    expect(slug).toBeNull();
    expect(calls).toBe(SLUG_ATTEMPTS);
  });
});
