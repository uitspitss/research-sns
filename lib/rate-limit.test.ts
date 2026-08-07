import { describe, expect, it } from "vitest";
import { POST_RATE_LIMITS } from "./limits";
import { rateLimitVerdict } from "./rate-limit";

const NOW = new Date("2026-08-08T12:00:00.000Z");

/** now から n ミリ秒前 */
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("rateLimitVerdict", () => {
  it("境界の投稿が無ければ通す（まだ上限に達していない）", () => {
    expect(
      rateLimitVerdict(
        [
          { scope: "burst", boundaryAt: null },
          { scope: "sustained", boundaryAt: null },
        ],
        NOW,
      ),
    ).toEqual({ allowed: true });
  });

  it("境界の投稿が窓の外まで流れていれば通す", () => {
    const verdict = rateLimitVerdict(
      [{ scope: "burst", boundaryAt: ago(POST_RATE_LIMITS.burst.windowMs + 1) }],
      NOW,
    );
    expect(verdict).toEqual({ allowed: true });
  });

  it("境界の投稿がまだ窓の中なら弾く", () => {
    const verdict = rateLimitVerdict([{ scope: "burst", boundaryAt: ago(60_000) }], NOW);

    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) return;
    expect(verdict.scope).toBe("burst");
    expect(verdict.limit).toBe(POST_RATE_LIMITS.burst.limit);
    // 5分の窓に1分前の投稿 → 残り4分
    expect(verdict.retryAfterSeconds).toBe(240);
  });

  it("再試行までの秒数は切り上げる（0 を返して即再試行させない）", () => {
    const verdict = rateLimitVerdict(
      [{ scope: "burst", boundaryAt: ago(POST_RATE_LIMITS.burst.windowMs - 1) }],
      NOW,
    );

    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) return;
    expect(verdict.retryAfterSeconds).toBe(1);
  });

  it("窓のちょうど境界は通す（未満だけを制限中とみなす）", () => {
    expect(
      rateLimitVerdict([{ scope: "burst", boundaryAt: ago(POST_RATE_LIMITS.burst.windowMs) }], NOW),
    ).toEqual({ allowed: true });
  });

  it("複数の窓のうち先に当たったものを返す", () => {
    const verdict = rateLimitVerdict(
      [
        { scope: "burst", boundaryAt: null },
        { scope: "sustained", boundaryAt: ago(60 * 60_000) },
      ],
      NOW,
    );

    expect(verdict.allowed).toBe(false);
    if (verdict.allowed) return;
    expect(verdict.scope).toBe("sustained");
    // 24時間の窓に1時間前の投稿 → 残り23時間
    expect(verdict.retryAfterSeconds).toBe(23 * 60 * 60);
  });
});

describe("POST_RATE_LIMITS", () => {
  it("burst は sustained より短い窓・少ない上限になっている", () => {
    expect(POST_RATE_LIMITS.burst.windowMs).toBeLessThan(POST_RATE_LIMITS.sustained.windowMs);
    expect(POST_RATE_LIMITS.burst.limit).toBeLessThan(POST_RATE_LIMITS.sustained.limit);
  });
});
