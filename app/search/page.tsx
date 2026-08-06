import { EntryItem } from "@/components/entry-item";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { searchEntries } from "@/lib/entries";

export const dynamic = "force-dynamic";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const entries = query ? await searchEntries(query, 50) : [];

  return (
    <main>
      <form action="/search" className="mt-7 mb-1">
        <Field orientation="horizontal">
          <Input
            aria-label="検索語"
            className="h-9 flex-1"
            defaultValue={query}
            name="q"
            placeholder="端点をひとつ思い出せれば足りる"
          />
          <Button size="lg" type="submit">
            検索
          </Button>
        </Field>
      </form>

      {query && entries.length === 0 && (
        <Empty className="py-14">
          <EmptyHeader>
            <EmptyTitle>「{query}」を含む経路はありません</EmptyTitle>
            <EmptyDescription>別の端点で試してみてください。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {entries.map((e) => (
        <EntryItem entry={e} key={`${e.handle}/${e.slug}`} showTrigger={false} />
      ))}
    </main>
  );
}
