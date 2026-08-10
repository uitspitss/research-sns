import Link from "next/link";
import { PathTrail } from "@/components/path-trail";
import type { EntrySummary } from "@/lib/entries";

/**
 * 一覧に並ぶ 1 本の経路。タイムライン・検索・ユーザーページの 3 箇所で使う。
 * 出し分けは 2 つだけ: ユーザーページでは @handle が自明なので出さず、
 * 検索結果はきっかけを畳んで密度を上げる。
 */
export function EntryItem({
  entry,
  showHandle = true,
  showTrigger = true,
}: {
  entry: EntrySummary;
  showHandle?: boolean;
  showTrigger?: boolean;
}) {
  return (
    <article className="border-b py-[30px]">
      <div className="flex gap-3 font-mono text-[11.5px] tracking-[0.03em] text-muted-foreground">
        {showHandle && <Link href={`/u/${entry.handle}`}>@{entry.handle}</Link>}
        <time>{entry.loggedOn}</time>
      </div>
      <h2 className="mt-2 font-serif text-[19px] leading-[1.5] font-medium xs:text-[22px]">
        <Link href={`/e/${entry.handle}/${entry.slug}`}>{entry.title}</Link>
      </h2>
      <PathTrail path={entry.path} />
      {showTrigger && entry.trigger && (
        <p className="mt-3.5 text-sm text-muted-foreground">{entry.trigger}</p>
      )}
    </article>
  );
}
