import { Fragment } from "react";
import { cn } from "@/lib/utils";

/**
 * 経路の表示。始点から終点までの軌跡そのものがこの製品の中身なので、
 * 見出しの下に必ず出す。一覧では長い経路を畳んで、中間の本数だけ示す。
 *
 * ノードは Badge ではなく素のマークアップ。この製品固有の等幅・極小サイズの
 * タイポグラフィを持っていて、Badge のバリアントに載せると className で
 * 文字サイズを上書きし返すことになるため。
 */
export function PathTrail({ path, large = false }: { path: string[]; large?: boolean }) {
  if (path.length === 0) return null;

  const nodes: { label: string; faint?: boolean }[] =
    large || path.length <= 4
      ? path.map((label) => ({ label }))
      : [
          { label: path[0] },
          { label: `+${path.length - 2}`, faint: true },
          { label: path[path.length - 1] },
        ];

  return (
    <div className="mt-2.5 flex flex-wrap items-center">
      {nodes.map((n, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <span
              aria-hidden
              className={cn("h-px shrink-0 bg-trail", large ? "w-6" : "w-[18px]")}
            />
          )}
          <span
            className={cn(
              "rounded-sm border border-trail bg-card font-mono tracking-[0.02em] whitespace-nowrap text-primary",
              large ? "px-[11px] py-1 text-[13px]" : "px-2 py-0.5 text-[11.5px]",
              n.faint && "border-border text-muted-foreground",
            )}
          >
            {n.label}
          </span>
        </Fragment>
      ))}
    </div>
  );
}
