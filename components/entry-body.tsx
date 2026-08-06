import { Badge } from "@/components/ui/badge";

/**
 * 本文は markdown の箇条書きだけを想定している。
 * 完全な markdown パーサは持ち込まず、行頭 "-" と「※未確認」だけを解釈する。
 * 追記専用の短いテキストなので、これで足りる。
 */
export function EntryBody({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    // Tailwind の preflight が ul のマーカーと padding を落とすので、明示的に戻す
    <ul className="mt-5 list-disc pl-[1.2em]">
      {lines.map((line, i) => {
        const text = line.replace(/^[-*]\s*/, "");
        const unverified = text.includes("※未確認");
        return (
          <li className="mb-1.5" key={i}>
            {text.replace(/\s*※未確認\s*/, "")}
            {unverified && (
              <Badge className="ml-1.5 font-mono" variant="outline">
                未確認
              </Badge>
            )}
          </li>
        );
      })}
    </ul>
  );
}
