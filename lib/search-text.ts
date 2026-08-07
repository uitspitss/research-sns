export type SearchableEntry = {
  title: string;
  trigger: string | null;
  path: string[];
  body: string;
  twist: string | null;
};

/**
 * entry.search_text の値を組み立てる。
 *
 * この列は trigram の GIN インデックス + ILIKE で検索するためのもの。
 * 生成カラムにできない理由は db/schema.ts のコメントを参照。
 *
 * 挿入経路（lib/post-entry.ts / db/seed.ts / e2e/prepare-db.ts）は必ずこの関数を通すこと。
 * 直接文字列を組み立てると、検索対象から漏れる項目が出る。
 */
export function buildSearchText(entry: SearchableEntry): string {
  return [entry.title, entry.trigger, ...entry.path, entry.body, entry.twist]
    .filter((v): v is string => typeof v === "string" && v !== "")
    .join(" ");
}
