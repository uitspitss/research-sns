import { describe, expect, it } from "vitest";
import { HANDLE_RULE, validateHandle } from "./handle";

describe("validateHandle", () => {
  it("英小文字・数字・アンダースコアの2〜20文字を通す", () => {
    for (const ok of ["ab", "user_1", "a".repeat(20), "0123456789"]) {
      expect(validateHandle(ok), ok).toEqual({ ok: true, handle: ok });
    }
  });

  it("短すぎる / 長すぎるものを弾く", () => {
    expect(validateHandle("a").ok).toBe(false);
    expect(validateHandle("a".repeat(21)).ok).toBe(false);
  });

  it("大文字・記号・日本語を弾く", () => {
    for (const ng of ["User", "user-1", "user.1", "ユーザー", "user 1", ""]) {
      expect(validateHandle(ng).ok, ng).toBe(false);
    }
  });

  it("前後の空白は落としてから検証する", () => {
    expect(validateHandle("  user_1  ")).toEqual({ ok: true, handle: "user_1" });
  });

  it("文字列以外を弾く", () => {
    expect(validateHandle(undefined).ok).toBe(false);
    expect(validateHandle(null).ok).toBe(false);
    expect(validateHandle(123).ok).toBe(false);
  });

  it("予約語を弾く（ルーティングと衝突するため）", () => {
    for (const reserved of ["api", "search", "settings", "e", "u"]) {
      expect(validateHandle(reserved).ok, reserved).toBe(false);
    }
  });

  it("失敗時は理由を返す", () => {
    const result = validateHandle("ユーザー");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(HANDLE_RULE);
  });
});
