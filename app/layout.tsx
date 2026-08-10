import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

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
            <Link className="font-serif text-[21px] font-medium tracking-[0.18em]" href="/">
              research-sns
            </Link>
            {/* リンクが2本になったぶん、520px 未満では説明文を落として場所を空ける */}
            <span className="hidden font-mono text-[11px] tracking-[0.04em] text-muted-foreground xs:inline">
              調べ物で辿った経路
            </span>
            {/*
              ログイン状態はここに出さない。layout でセッションを読むと全ページが
              dynamic に落ちて ISR（タイムライン60秒・エントリ本体300秒）が消える。
              未ログインなら /settings 自体がログインカードを出すので、動線はこれで足りる。
            */}
            {/*
              この2本だけ prefetch を切る。どちらも force-dynamic で、loading.tsx も無いので
              先に取れる静的シェルが存在しない。全ページのヘッダーに載るぶん無駄弾になる。
              ISR の /・/u・/e へのリンクは既定のまま（prefetch がキャッシュに当たる）
            */}
            <nav className="ml-auto flex gap-4 font-mono text-xs text-muted-foreground">
              <Link className="hover:text-primary" href="/search" prefetch={false}>
                検索
              </Link>
              <Link className="hover:text-primary" href="/settings" prefetch={false}>
                設定
              </Link>
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
