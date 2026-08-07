import { describe, expect, it } from "vitest";
import { QUERY_LIMITS } from "@/lib/limits";
import { parseEntriesQuery } from "./schema";

const query = (s: string) => parseEntriesQuery(new URLSearchParams(s));

describe("parseEntriesQuery", () => {
  it("何も指定しなければ既定値だけになる", () => {
    const parsed = query("");
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).toEqual({ limit: QUERY_LIMITS.rest.fallback });
  });

  // 手書きで詰めていたときは -5 が素通りして Postgres が 500 で落ちていた
  it("limit の壊れた値は既定値に倒す", () => {
    for (const bad of ["limit=-5", "limit=0", "limit=abc", "limit=", "limit=1.5", "limit=1e999"]) {
      const parsed = query(bad);
      expect(parsed.success, bad).toBe(true);
      if (parsed.success) expect(parsed.data.limit, bad).toBe(QUERY_LIMITS.rest.fallback);
    }
  });

  it("limit は範囲内ならそのまま使う", () => {
    expect(query("limit=1").success && query("limit=1")).toMatchObject({ data: { limit: 1 } });
    expect(query(`limit=${QUERY_LIMITS.rest.max}`)).toMatchObject({
      data: { limit: QUERY_LIMITS.rest.max },
    });
  });

  it("limit が上限を超えたら既定値に倒す", () => {
    expect(query(`limit=${QUERY_LIMITS.rest.max + 1}`)).toMatchObject({
      data: { limit: QUERY_LIMITS.rest.fallback },
    });
  });

  it("空文字は指定なしとして扱う", () => {
    const parsed = query("handle=&q=");
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.handle).toBeUndefined();
    expect(parsed.data.q).toBeUndefined();
  });

  // 黙って0件を返すと、綴り間違いと「本当に無い」が区別できない
  it("handle の形が違えば弾く", () => {
    expect(query("handle=Ueno").success).toBe(false);
    expect(query("handle=a").success).toBe(false);
    expect(query("handle=user-1").success).toBe(false);
    expect(query("handle=e2etester").success).toBe(true);
  });

  it("q は長すぎれば弾く", () => {
    expect(query(`q=${"あ".repeat(200)}`).success).toBe(true);
    expect(query(`q=${"あ".repeat(201)}`).success).toBe(false);
  });
});
