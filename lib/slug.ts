/**
 * エントリの slug の生成と、衝突したときの入れ直し。
 *
 * **このファイルは DB を掴まない。** insert を引数で受けるのは抽象化のためではなく、
 * 衝突の再試行をテストするため。実物では同じユーザーが同じ日に投稿して4桁hex まで
 * 一致する必要があり（約1/65536）、E2E では踏めない。
 * ここを引数にしておけば、確実に衝突させて再試行と枯渇を確かめられる。
 */

export const SLUG_ATTEMPTS = 5;

/** 見出しが日本語なので slug には使わない。日付 + ランダム4桁にする */
export function newSlug(loggedOn: string): string {
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(2)))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");

  return `${loggedOn}-${suffix}`;
}

/**
 * slug を作って insert し、衝突したら作り直して入れ直す。
 * 入った slug を返す。上限まで衝突したら null。
 *
 * `isCollision` が false を返したエラー（接続断・別の制約違反）は投げ直す。
 * 握り潰すと、原因の違う失敗が「slug が作れなかった」に化ける。
 */
export async function insertWithUniqueSlug(
  makeSlug: () => string,
  insert: (slug: string) => Promise<unknown>,
  isCollision: (error: unknown) => boolean,
  attempts: number = SLUG_ATTEMPTS,
): Promise<string | null> {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const slug = makeSlug();
    try {
      // 再試行は前の試行が失敗して初めて意味を持つので、並列化できない
      // eslint-disable-next-line no-await-in-loop
      await insert(slug);
      return slug;
    } catch (e) {
      if (!isCollision(e)) throw e;
    }
  }

  return null;
}
