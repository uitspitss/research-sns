import { describe, expect, it } from "vitest";
import { isUniqueViolation } from "./db-error";

/** 実測した形状を再現する。Drizzle は元のエラーを cause に包んで投げる。 */
function drizzleWrapped(code: string, constraint?: string) {
  const inner = Object.assign(new Error("duplicate key value violates unique constraint"), {
    code,
    constraint,
  });
  return Object.assign(new Error("Failed query"), { cause: inner });
}

describe("isUniqueViolation", () => {
  it("unique 制約違反 (23505) を検出する", () => {
    expect(isUniqueViolation(drizzleWrapped("23505"))).toBe(true);
  });

  it("制約名を指定すると、その制約のときだけ true", () => {
    const err = drizzleWrapped("23505", "user_handle_unique");

    expect(isUniqueViolation(err, "user_handle_unique")).toBe(true);
    expect(isUniqueViolation(err, "entry_user_slug_key")).toBe(false);
  });

  it("他の DB エラーを unique 違反と誤認しない", () => {
    // 23503 = foreign_key_violation, 08006 = connection_failure
    expect(isUniqueViolation(drizzleWrapped("23503"))).toBe(false);
    expect(isUniqueViolation(drizzleWrapped("08006"))).toBe(false);
  });

  it("包まれていない素のエラーでも検出する（neon-http 経路）", () => {
    const bare = Object.assign(new Error("dup"), {
      code: "23505",
      constraint: "user_handle_unique",
    });

    expect(isUniqueViolation(bare)).toBe(true);
    expect(isUniqueViolation(bare, "user_handle_unique")).toBe(true);
  });

  it("DB 由来でないものを false にする", () => {
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
  });

  it("制約名を指定したとき、制約名が無いエラーは false", () => {
    // 制約名で絞りたい意図なのに情報が無いなら、握り潰さず呼び出し元に投げ返させる
    expect(isUniqueViolation(drizzleWrapped("23505"), "user_handle_unique")).toBe(false);
  });
});
