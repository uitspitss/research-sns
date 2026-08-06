import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "research-sns",
  description: "調べ物で辿った経路を残す場所",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      {/*
        next/font には寄せていない。Shippori Mincho は日本語のサブセットが
        244 個の woff2 に分割されていて、next/font/google はそのうち一部だけを
        取るということができない（subsets は preload 対象の指定でしかなく、
        CSS2 が返すファイルは全部ダウンロードする）。コールドビルドのたびに
        244 リクエストを投げることになり、Google 側に弾かれてビルドが落ちる。
      */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="mx-auto max-w-[660px] px-6 pb-24">
          <header className="mb-2 flex items-baseline gap-4 border-b pt-7 pb-5">
            <a className="font-serif text-[21px] font-medium tracking-[0.18em]" href="/">
              research-sns
            </a>
            <span className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
              調べ物で辿った経路
            </span>
            <a
              className="ml-auto font-mono text-xs text-muted-foreground hover:text-primary"
              href="/search"
            >
              検索
            </a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
