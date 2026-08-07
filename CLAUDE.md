# 開発ルール

## このプロジェクトの構成

Next.js 16 (App Router) + Postgres + Drizzle ORM。Vite ではないので、Vite 前提の手順を
そのまま持ち込まないこと。

- 書き込みは Bearer トークンを持つエージェントだけ。**Web に投稿フォームは作らない**
- エントリは不変。更新・削除エンドポイントは意図的に存在しない
- ページは ISR（タイムライン 60 秒 / エントリ本体 300 秒）

**投稿のロジックは `lib/post-entry.ts` の `postEntry()` に1本化してある。**
入口は2つ（`POST /api/entries` と MCP の `research_sns_post_entry`）だが、どちらも
ここを通る。**3つ目の入口を足すときも同じ関数を通すこと** — レート制限をここに
置いてあるので、迂回する経路を作ると制限の抜け道になる。

投稿まわりのファイルは「純粋な値 → 純粋なスキーマ → DB」の順に依存する。
**この向きを逆流させないこと**（理由は後述）。

| | |
| --- | --- |
| `lib/limits.ts` | 上限値だけ。**何も import しない** |
| `lib/entry-input.ts` | 共通フィールドと REST 用スキーマ。DB を掴まない |
| `app/api/mcp/schema.ts` | MCP 用スキーマ。エージェントに配る契約なので MCP の隣に置く |
| `lib/post-entry.ts` | 保存。ここだけが DB を掴む |

- **上限値を書き写さない。** 決めているのは `lib/limits.ts` だけ
- MCP は REST より3点だけ厳しい（`path` 必須 / `sources` を落とさず弾く / 知らないキーを弾く）。
  理由は `app/api/mcp/schema.ts` 冒頭のコメントを参照
- **レート制限はユーザー単位で数える。トークン単位にしない。**
  トークンは何本でも発行できるので、トークンで数えると発行し直すだけで枠が戻る
- `entry.agent_token_id` は投稿元のトークン。集計には使わない、事故の追跡用。
  **挿入経路はこの列を必ず埋めること**

### 定数を DB を掴むファイルに置かない

`lib/db.ts` は **import した時点で** `DATABASE_URL` を読んで、無ければ throw する。
そのため `lib/db` を静的 import しているファイル（`token.ts` / `entries.ts` /
`post-entry.ts` / `rate-limit.ts`）に定数を置くと、**その値を1つ読みたいだけの側が
DB 接続まで背負う**。実際、上限値を `lib/token.ts` に置いたときは E2E が
`DATABASE_URL is not set` で落ちた。

共有したい値は `lib/limits.ts` に置くこと。`e2e/prepare-db.ts` が `hashToken` を
動的 import しているのは、この制約の回避策（あちらは関数なので移せない）。

**ログイン（better-auth + Google）は投稿経路ではない。** `/settings` で handle を取ることと、
エージェント用トークンを発行・失効させることの2つだけを担う。ここに投稿 UI を足さないこと。

## 開発サーバー

`nr dev` は Turborepo 経由で **Next の dev サーバーと Drizzle Studio を同時に起動**する。

- **Claude Code など非対話環境から動かすときは `nr dev:stream` を使う。**
  Turborepo の既定 TUI は表示が崩れる
- Next だけ動かしたいときは `nr dev:next`
- モノレポではない。`turbo.json` はこの2タスクの並列起動のためだけに置いている

## DB

- **スキーマの正は `db/schema.ts`（Drizzle）。** 生 SQL の DDL は置かない
- 変更手順: `db/schema.ts` を編集 → `nr db:generate` → 生成された migration を確認 → `nr db:migrate`
- `db/migrations/` は生成物だがコミットする。手で編集しない
- ローカルは docker（`nr db:up`）、本番は Neon。`lib/db.ts` が `DATABASE_URL` を見て
  ドライバを切り替える（neon-http / node-postgres）
- 拡張（`pgcrypto` / `pg_trgm`）は migration に含まれない。ローカルは
  `db/init/01-extensions.sql`、Neon は手で一度実行する
- `entry.search_text` は生成カラムではなく挿入時に確定させる列。
  挿入経路は必ず `buildSearchText()` を通すこと（理由は db/schema.ts のコメント）

## コード変更後の検証

コードを変更したら、以下を実行してエラーがないことを確認する:

- `nr lint` (oxlint)
- `nr format:check` (oxfmt)
- `nr typecheck` (next typegen && tsc --noEmit)

`nr typecheck` が `next typegen` を先に走らせるのは、`next-env.d.ts` と `.next/types/` が
gitignore された生成物で、クリーンな環境には存在しないため。

## Next.js 16 / TypeScript 7 まわり

- ビルドと dev は Turbopack がデフォルト（`--turbopack` フラグは不要）
- `tsconfig.json` の `jsx` は Next が `react-jsx` に固定する。`preserve` に戻さないこと。
  手で書き換えても `next typegen` / `next build` が上書きする
- `typescript` は 7 系（Go 実装のネイティブ版）。コマンドは `tsc` で、`tsgo` は使わない
- **route handler に `export const runtime = "edge"` を足さない。** Next 16 で deprecated。
  Node runtime なら静的生成も効く（edge はページの静的生成を無効化する）。
  `app/api/mcp/route.ts` も同じ理由で Node のまま（`pg` のドライバが edge で動かない）

## MCP サーバー

`app/api/mcp/route.ts`。`mcp-handler` + `@modelcontextprotocol/server`（どちらも v2 系）。

- **`inputSchema` には `z.object(...)` を丸ごと渡す。** 生の shape（`{ a: z.string() }`）は
  v2 で deprecated。**`@modelcontextprotocol/sdk`（v1 系の旧パッケージ）は使わない**
- ツール名は `research_sns_` 始まり。他の MCP サーバーと同居したとき `get_entry` のような
  名前は衝突する
- **ツールハンドラの `ctx` に元の `Request` は入っていない**（`ctx.http` は `authInfo` だけ）。
  投稿 URL の origin は `BETTER_AUTH_URL` から取る。未設定なら throw する
  （壊れた URL が不変のエントリとして残るため）
- 認証は `withMcpAuth(..., { required: false })`。読み取り2つは無認証で通す。
  `verifyToken` は**トークンが無ければ `undefined`、あるのに引けなければ throw**。
  ここを取り違えると、綴りを間違えた人に「トークンがありません」と言うことになる
- ツールの description は毎回コンテキストに乗る。**足すときは分量に見合うかを考えること**

## テスト

- TDD（テスト駆動開発）で実装する
- テストを先に書き、実装はテストが通るように行う

vitest は 2 プロジェクト構成（`vitest.config.ts` を参照）。

| コマンド | 中身 |
| --- | --- |
| `nr test` | 両方 |
| `nr test:unit` | happy-dom。ロジックと DOM 構造 |
| `nr test:storybook` | Chromium 実機。`*.stories.tsx` をテストとして実行 |
| `nr test:watch` | happy-dom だけを watch |

- DOM テストは happy-dom + Testing Library。`vitest.setup.ts` で `cleanup` を明示登録している
- **CSS が効いていないと確かめられないことは storybook 側で書く。** happy-dom は
  Tailwind のクラスを解決しないので、`getComputedStyle` の検証は必ず実機側に置く
- storybook プロジェクトは Playwright の Chromium を使う。CI では
  `playwright install --with-deps chromium` を先に走らせている

## E2E（@playwright/test）

`nr test` とは**別系統**。サーバーを起動して、ページ遷移・認証・DB を貫く経路だけを見る。
`playwright.config.ts` と `e2e/` を参照。

| コマンド | 中身 |
| --- | --- |
| `nr test:e2e` | DB 準備 → build → start → テスト（`nr db:up` 済みが前提） |
| `nr test:e2e:ui` | 同上を Playwright の UI モードで |
| `nr db:e2e:prepare` | DB の作成・migration・データ投入だけ |

- **`nr test` に E2E を入れない。** lefthook にも入れない。サーバーと DB が要る
- **開発用のデータベース（`research_sns`）を使わない。** エントリは不変で削除経路が
  無いので汚れが残り続ける。E2E は**同じコンテナの別データベース**（`research_sns_e2e`）を見る。
  コンテナは分けない。データベースを分ければ足りる（毎回テーブルを空にするため）
- **そのデータベースと拡張は `e2e/prepare-db.ts` が無ければ作る。** compose の
  `db/init/` は**ボリュームが空のときしか流れない**ので、既存の開発環境では作られない。
  `nr db:up` さえ済んでいれば他に用意するものは無い
- **データは `e2e/prepare-db.ts` が playwright より先に入れる。** `db/seed.ts` は流用しない。
  `/` が ISR（60秒）なので、**サーバーが上がる前**にデータが揃っている必要がある
- **build も `webServer` に含めてある**（`pnpm run build && pnpm run start`）。
  別の場所で `nr build` すると ISR のページに開発 DB の内容が焼き込まれる
- 認証は better-auth の `testUtils` プラグイン。`e2e/auth-instance.ts` が
  **`lib/auth.ts` とは別のインスタンス**を持つ（プラグインを本番 config に入れないため）。
  `secret` を食い違わせると署名検証に落ちるが**エラーは出ず未ログイン扱いになる**
- **件数で assert しない。** 同じ DB を共有するので、実行順と retry で本数が変わる
- E2E は `*.spec.ts`、unit は `*.test.ts`。vitest の `include` は `{app,components,lib}` に
  限定してあるので現状は衝突しないが、拡張子でも分けてある

新しく足すときの手順は `setup-dev:e2e` スキルを参照。

## Storybook

`nr storybook` で起動（6006）。`nr build-storybook` で静的ビルド。

- **ストーリーは対象と同じ場所に置く**（`components/path-trail.stories.tsx`）。
  対象は `components/**/*.stories.tsx` と `app/**/*.stories.tsx`
- **`components/ui/**` にもストーリーを書く。** vendored だからと省かないこと。
  ソースを自分たちで持つのが shadcn の前提だし、この配色でどう出るかは
  upstream のドキュメント（zinc 前提）からは分からない。ローカルで変えた
  `alert.tsx` の `accent` と `input.tsx` の `bg-card` は、そもそも upstream に載っていない
- 配色とフォントは `.storybook/preview.tsx` が `app/globals.css` を、
  `.storybook/preview-head.html` が明朝体の `<link>` を読んで揃えている
- `play` は「描画されただけでは分からないこと」にだけ書く。
  引数違いのバリエーションには付けない（描画に失敗すればテストは落ちるため）
- `path-trail.stories.tsx` の `CssCheck` は、Tailwind が実際に読み込まれているかの
  番人。これが落ちたら他のストーリーの見た目は信用できない

### サーバーアクションの差し替え

`app/settings/actions.ts` は `"use server"` で `lib/db`（pg）と better-auth を掴んでいる。
ブラウザに持ち込むと `Buffer is not defined` で落ちるので、`.storybook/main.ts` の
`research-sns:mock-server-actions` プラグインが解決の段で
`app/settings/__mocks__/actions.js` に差し替えている。

**`actions.ts` に export を足したら `__mocks__/actions.js` にも足すこと。**
Storybook 公式の `sb.mock()` を使っていないのは、`forms.tsx` から張られた
`./actions` の推移的な import までは捕まえられず実体が評価されてしまうため。

## ファイル命名規則

- kebab-case を使用する (例: `my-component.tsx`, `use-auth.ts`)
- PascalCase は使わない。**コンポーネント名が PascalCase でもファイル名は kebab-case**
  （`export function PathTrail` は `components/path-trail.tsx` に置く）
- テストは対象と同じ名前 + `.test`（`path-trail.tsx` → `path-trail.test.tsx`）

## フロントエンド（Tailwind v4 + shadcn/ui）

- **配色の正は `app/globals.css` の `:root`。** 元の「紙とインク」の変数を shadcn の
  セマンティックトークンに移してある。対応表はファイル冒頭のコメントを見ること
- **`--accent` の意味が元の設計と shadcn で違う。** 元の accent（ティール #0E6B60）は
  shadcn では `--primary`。shadcn の `--accent` は hover 時の淡い背景で別物
- ダークモードは持たない。`@custom-variant dark` の宣言だけあるのは
  `shadcn/tailwind.css` が `@variant dark` を使うため。`.dark` を付ける場所はない
- 角丸は全段階 2px。罫線 1px と合わせて元の設計をそのまま維持している
- コンポーネントの追加は `pnpm dlx shadcn@latest add <名前>`。**`next.config.ts` を消さないこと。**
  shadcn の CLI はこのファイルの有無でフレームワークを判定していて、無いと `add` が止まる
- `components/ui/**` を編集したときは、その場に理由をコメントで残す
  （現状 `alert.tsx` の `accent` variant と `input.tsx` の `bg-card` の 2 箇所）

## フォントを next/font に寄せていない理由

`app/layout.tsx` は Google Fonts を `<link>` で読んでいる。next/font/google は使わない。

Shippori Mincho は日本語サブセットが 244 個の woff2 に分割されていて、next/font は
そのうち一部だけを取ることができない（`subsets` は preload 対象の指定でしかなく、
CSS2 が返すファイルは全部ダウンロードする）。コールドビルドのたびに 244 リクエストを
投げることになり、Google 側に弾かれてビルドが落ちる。実際に再現済み。

自前ホストしたいなら next/font/local + サブセット済みの woff2 を置くこと。

## knip の設定（shadcn / Tailwind v4 向け）

- `project` に `css` を含める。Tailwind v4 は設定を CSS に持つので、`app/globals.css` の
  `@import` を追わないと `tailwindcss` / `tw-animate-css` / `shadcn` が未使用に見える
- **`components/ui/**` を `ignore` しない。** 除外すると `@base-ui/react` などの import が
  追えなくなり、未使用依存として誤検出される。代わりに `ignoreIssues` で
  そのディレクトリの `exports` / `types` だけ対象外にする（生成コードなので
  ファミリー全体が export されるのは正常）
- `lucide-react` は `components.json` の `iconLibrary` 指定。
  `components/ui/button.stories.tsx` が実際に import しているので ignore は要らない

## リンタ設定で意図的に緩めているもの

`.oxlintrc.json` を参照。

- `nextjs/no-page-custom-font`: off — Pages Router の `_document.js` 前提のルールで、
  App Router の `app/layout.tsx` に font link を置くのは正しいため誤検知
- `nextjs/no-html-link-for-pages`: warn — 内部リンクが `<a>` のまま。`next/link` に寄せると
  クライアント遷移になるが、静的寄りの読み物サイトなので現状は許容。移行するなら一括で
- `import/no-unassigned-import`: `*.css` を許可 — `import "./globals.css"` は Next の定石

## フォーマッタの対象外

`.oxfmtrc.json` で除外しているのは `**/*.md` だけ。oxfmt の markdown 整形に
emphasis のアンダースコアを壊すバグがあるため。

かつて除外していたものは、いずれも対象に戻してある。

- `**/*.css` — 旧 `globals.css` は手で詰めた 1 行ルールが多かったので外していたが、
  Tailwind 移行で書き直したので理由が消えた。`@theme` / `@apply` / `@custom-variant` は
  oxfmt が壊さないことを確認済み
- `components/ui/**` — vendored ではあるが実際に手を入れている（`alert.tsx` の `accent`、
  `input.tsx` の `bg-card`）。自分の変更だけ体裁が揃わないほうが困る。
  **副作用として `shadcn add <名前> --diff` の差分はノイズだらけになる**
  （upstream はセミコロン無しなので全行が変更扱いになる）。更新するときは差分を
  鵜呑みにせず、ローカルを読む → `--view` で upstream を見る → 手で当てる、の順で行うこと

## 依存更新（Dependabot）

- 毎週月曜に Dependabot が PR を出す
- minor/patch は group でまとめられる。メジャー更新は個別 PR で人間レビュー必須
- セキュリティ脆弱性は設定とは独立して自動 PR が来る

## 環境変数

**dotenvx で管理している。`.env` は暗号化されてリポジトリに入っている。**

- 値の追加・変更は `nr env:set KEY value`。**`.env` を手で編集しない**（平文が混ざる）
- `.env.keys` は復号キー。gitignore 済み。**絶対にコミットしない**
- `.env.example` は置かない（暗号化された `.env` のキー名がドキュメントになる）
- pre-commit の `encrypt-env` フックが、平文のままの `.env` を自動で暗号化してからステージする

必要な変数は `DATABASE_URL` / `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` /
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`。詳細は README の「環境変数」を参照。

**環境変数を読むコマンドは `dotenvx run --` を通す。** `package.json` の `dev` / `build` /
`start` / `db:*` は既にそうなっている。`drizzle-kit` を直に叩くと `DATABASE_URL` が
未設定になるので、必ず `nr db:migrate` のように scripts 経由で実行すること。

**既にセットされている環境変数を dotenvx は上書きしない。** Vercel や CI では
プラットフォーム側の環境変数がそのまま勝つ。逆に言うと、CI で埋め忘れた変数には
復号できなかった暗号文（`"encrypted:..."`）が入るので、**CI の `env:` はアプリが使う変数を
全部列挙する**こと。

## 推奨 Claude Code スキル

- frontend-design - フロントエンド UI 作成

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
