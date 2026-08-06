import { EntryItem } from "@/components/entry-item";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { listRecentEntries } from "@/lib/entries";

export const revalidate = 60; // 追記専用なので、そう頻繁に変わらない

export default async function Timeline() {
  const entries = await listRecentEntries(40);

  if (entries.length === 0) {
    return (
      <Empty className="py-14">
        <EmptyHeader>
          <EmptyTitle>まだ経路がありません</EmptyTitle>
          <EmptyDescription>
            スキルから <code>POST /api/entries</code> を投げると、ここに並びます。
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <main>
      {entries.map((e) => (
        <EntryItem entry={e} key={`${e.handle}/${e.slug}`} />
      ))}
    </main>
  );
}
