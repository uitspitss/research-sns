import { notFound } from "next/navigation";
import { EntryItem } from "@/components/entry-item";
import { handleExists, listEntriesByHandle } from "@/lib/entries";

export const revalidate = 60;

export default async function UserPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  if (!(await handleExists(handle))) notFound();

  const entries = await listEntriesByHandle(handle, 100);

  return (
    <main>
      <p className="pt-6 font-mono text-sm text-muted-foreground">
        @{handle} — {entries.length} 本の経路
      </p>
      {entries.map((e) => (
        <EntryItem entry={e} key={e.slug} showHandle={false} />
      ))}
    </main>
  );
}
