import { notFound } from "next/navigation";
import { EntryBody } from "@/components/entry-body";
import { PathTrail } from "@/components/path-trail";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { findEntry } from "@/lib/entries";
import { DeleteEntry } from "./delete-entry";

export const revalidate = 300;

export default async function EntryPage({
  params,
}: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  const { handle, slug } = await params;

  const e = await findEntry(handle, slug);
  if (!e) notFound();

  return (
    <main>
      <article className="py-[30px]">
        <div className="flex gap-3 font-mono text-[11.5px] tracking-[0.03em] text-muted-foreground">
          <a href={`/u/${e.handle}`}>@{e.handle}</a>
          <time>{e.loggedOn}</time>
        </div>
        <h1 className="mt-2.5 font-serif text-[22px] leading-[1.5] font-medium xs:text-[27px]">
          {e.title}
        </h1>
        <PathTrail large path={e.path} />
        {e.trigger && <p className="mt-3.5 text-sm text-muted-foreground">{e.trigger}</p>}

        <EntryBody body={e.body} />

        {e.twist && (
          <Alert className="mt-6 px-[18px] py-4" variant="accent">
            <AlertTitle className="font-mono text-[10.5px] tracking-[0.12em] text-primary">
              ねじれ
            </AlertTitle>
            <AlertDescription className="text-foreground">{e.twist}</AlertDescription>
          </Alert>
        )}

        {e.sources.length > 0 && (
          <div className="mt-7">
            <span className="font-mono text-[10.5px] tracking-[0.12em] text-muted-foreground">
              出典
            </span>
            <ul className="mt-1.5">
              {e.sources.map((s) => (
                <li className="mb-[3px]" key={s}>
                  <a
                    className="border-b border-trail font-mono text-xs break-all text-primary"
                    href={s}
                    rel="noopener noreferrer nofollow"
                    target="_blank"
                  >
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 所有者のときだけ中身が出る。判定はクライアント側（ISR を保つため） */}
        <DeleteEntry handle={e.handle} slug={e.slug} />
      </article>
    </main>
  );
}
