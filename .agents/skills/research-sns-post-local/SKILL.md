---
name: research-sns-post-local
description: ローカル開発サーバー（localhost:3000）の research-sns に投稿して、投稿経路を手元で確かめる。本番には投げない。/research-sns-post-local
disable-model-invocation: true
---

# ローカルの research-sns に投稿して経路を確かめる

**このリポジトリの開発用。配布物ではない**（`skills/` ではなく `.agents/skills/` に置いてある。
`.claude/skills/` と `.codex/skills` はそこへの symlink）。
`research-sns-post` スキルそのものや MCP サーバーに手を入れたとき、本番を汚さずに
投稿経路を通しで踏むために使う。

**投稿手順そのものはここに書かない。** 素材の拾い方・`path` の組み方・失敗したときの判断は
`research-sns-post` スキルが持っている。書き写すと二重管理になって片方が古くなる。
このスキルが持つのは**投げ先をローカルに固定することと、その前提の確認だけ**。

## 1. 前提を確かめる

満たないものがあれば**止めて、何を実行すべきかを伝える**。勝手に起動しない
（DB や dev サーバーはユーザーの手元の状態なので、こちらの判断で動かさない）。

| 確認 | 満たないとき |
|---|---|
| DB が上がっている（`docker compose ps`） | `nr db:up` |
| migration が当たっている | `nr db:migrate` |
| seed が入っている（`@hoshino` が居る） | `nr db:seed` |
| dev サーバーが **3000** で動いている | `nr dev:stream`（非対話環境では `nr dev` を使わない） |

**3000 以外に逃げていたら止める。** MCP の登録 URL も `.env` の `BETTER_AUTH_URL` も
3000 で固定してある。ポートがずれると繋がらないか、繋がっても**返ってくる URL が嘘になる**
（投稿 URL の origin は `BETTER_AUTH_URL` から作るので、実際に開けない URL がエントリとして残る）。

`nr db:seed` は `@hoshino` と固定の開発用トークンを入れ直し、そのトークンと curl の例を
標準出力に出す。トークンの実体は `db/seed.ts` の `DEV_TOKEN`。

## 2. 投げ先を名指しする

**呼ぶ前に、その名前が何処を向いているかを確かめる。**

```bash
claude mcp get research-sns-local | grep URL
```

Codex から使うときは登録先が違う。**`.codex/config.toml` の
`[mcp_servers.research-sns-local]` が正**で、以下の `claude mcp` は要らない。

`http://localhost:3000/api/mcp` でなければ**止める**。手順1は dev サーバーが応答することしか
見ておらず、**それは投げ先とは別の話**（両方立っていても、登録が本番を向いていれば本番に飛ぶ）。
名前は設定名でしかなく、中身を保証しない。手順4の URL 検査は投稿の**後**なので間に合わない。

**`grep URL` を外さない。** 素で叩くと Authorization ヘッダの Bearer が平文で出る。
seed の `DEV_TOKEN` は `db/seed.ts` に書いてある公開値なので構わないが、
手順5で自分のトークンに差し替えた後はログに残る。

確かめたら、呼ぶのは**これだけ**:

```
mcp__research-sns-local__research_sns_post_entry
```

**完全修飾名で呼ぶこと。** 素の `research_sns_post_entry` で呼んではいけない。
本番（`mcp__research-sns__*`）が同じ名前のツールを同じ説明で出しているので、
素の名前ではどちらに行くか決まらず、このスキルの意味が無くなる。

**`mcp__research-sns__*` はこのスキルからは絶対に呼ばない。** あれは本番で、
投げたものは公開され、消すにはユーザーが手でブラウザから消すしかない。

`mcp__research-sns-local__*` が見えない原因は3つ。dev サーバーが落ちている、
登録されていない、**登録したトークンが壊れている**（綴り間違いは接続ごと 401 になるので、
読み取りの2つを含めて1つも見えない）。登録は:

```bash
claude mcp add --scope local --transport http research-sns-local \
  http://localhost:3000/api/mcp \
  --header "Authorization: Bearer <db/seed.ts の DEV_TOKEN>"
```

**同名が既にあるなら先に消す。** `claude mcp add` は `already exists` で止まるだけで、
上書きしない。トークンや URL を直すときに足し直そうとすると、ここで行き止まりになる:

```bash
claude mcp remove research-sns-local -s local
```

**足したら Claude Code を再起動する**（MCP はセッション開始時にしか読まれない）。

## 3. 中身の作り方は配布スキルに従う

`research-sns-post` スキルを読み込み、その「2. 会話から素材を拾う」「3. path を組み立てる」に従う。
検証の厳しさ（`path` は2要素以上、知らないキーはエラー、など）はサーバー側が本番と同じなので、
ここで手加減しても弾かれ方は変わらない。

**ただし「4. 下書きを見せて承認を取る」は省いてよい。** あれは取り消せない公開投稿のための
段取りで、ローカルの使い捨てデータには要らない。テストのたびに承認を求めても手間が増えるだけ。

## 4. 投げたあとに確かめる

- 返ってきた `url` の origin が **`http://localhost:3000`** であること。
  **本番の URL が返ったら誤爆している。** 投げ先を間違えたことをユーザーに伝える
- `http://localhost:3000/u/hoshino` に出ていること。**最大60秒かかる。**
  あのページは ISR（`revalidate = 60`）で、投稿経路は `revalidatePath` を呼ばない
  （呼ぶのは削除経路だけ）。直後に出なくても異常ではないので、投げ直さない

## 5. 削除まで踏みたいとき

**このスキルの守備範囲外。** seed の `@hoshino` は Google アカウントに紐づいていないので
**そのユーザーとしてはログインできず、削除ボタンは出ない**（所有者判定はブラウザ側の
セッションの handle 比較）。

手で踏むなら、seed のトークンではなく自分のユーザーを作る:

1. `http://localhost:3000/settings` で Google ログイン → handle を決める → トークンを発行
2. そのトークンで投稿する。MCP を登録し直すと Claude Code の再起動が要るので、
   数件試すだけなら curl で `POST /api/entries` を叩くほうが早い
   （入口は違うが `postEntry()` を通るので保存経路は同じ）
3. 返った URL を開くと、末尾に削除の入口が出る

1 には Google 側に `http://localhost:3000/api/auth/callback/google` が承認済みリダイレクト URI
として登録されている必要がある。

**削除機能が壊れていないかの確認だけが目的なら `nr test:e2e` が最短**
（`e2e/entry-delete.spec.ts` が所有者・他人・未ログイン・レート制限の4本を見ている）。
