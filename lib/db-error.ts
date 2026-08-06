/** Postgres の unique_violation。 https://www.postgresql.org/docs/current/errcodes-appendix.html */
const UNIQUE_VIOLATION = "23505";

type PgErrorLike = { code?: unknown; constraint?: unknown; cause?: unknown };

/**
 * Drizzle は元のエラーを DrizzleQueryError で包み、ドライバのエラーを cause に入れる。
 * node-postgres なら DatabaseError、neon-http なら NeonDbError。どちらも
 * `code` / `constraint` を持つので、cause を辿って探す。
 */
function findPgError(error: unknown, depth = 0): PgErrorLike | undefined {
  if (typeof error !== "object" || error === null || depth > 5) return undefined;

  const e = error as PgErrorLike;
  if (typeof e.code === "string") return e;

  return findPgError(e.cause, depth + 1);
}

/**
 * unique 制約違反かどうか。
 *
 * **`catch {}` で握り潰さず、必ずこれで判定すること。** 接続断や権限エラーまで
 * 「すでに使われています」として扱うと、ユーザーは何度リトライしても
 * 同じ嘘のメッセージを見続けることになる。
 *
 * @param constraint 指定するとその制約のときだけ true。制約名が取れない場合は
 *   false を返し、呼び出し元に再 throw させる（誤って握り潰さないため）。
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const pg = findPgError(error);
  if (pg?.code !== UNIQUE_VIOLATION) return false;

  if (constraint === undefined) return true;
  return pg.constraint === constraint;
}
