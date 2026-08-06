/**
 * E2E 専用の接続先。
 *
 * ここに平文で置いてよいのは、いずれもローカルの開発用コンテナ向けの値で、
 * 本番と一切共有しないため。**`.env.e2e` のようなファイルは作らないこと** —
 * lefthook の `encrypt-env` が `.env*` を拾って暗号化してしまい、復号キーは
 * gitignore なので CI では `"encrypted:..."` がそのまま値になる。
 *
 * CI からは E2E_PG_URL で差し替えられるようにしてある。
 */

/** サーバまでの接続情報（データベース名は含めない）。開発用と同じコンテナを使う */
const PG = process.env.E2E_PG_URL ?? "postgres://research_sns:research_sns@localhost:5432";

/**
 * E2E は開発用（research_sns）とは**別のデータベース**を使う。
 *
 * E2E は必ず書き込むが、エントリは不変で削除経路が無いので、開発 DB を使うと
 * 汚れが溜まり続ける。コンテナまで分けなくても、データベースを分ければ足りる
 * （`e2e/prepare-db.ts` が毎回テーブルを空にする）。
 *
 * このデータベースと拡張は prepare-db.ts が無ければ作る。`nr db:up` 済みなら
 * 他に用意するものは無い。
 */
export const E2E_DB_NAME = "research_sns_e2e";

/** `create database` を実行するための接続先。postgres データベースは必ず存在する */
export const E2E_ADMIN_DATABASE_URL = `${PG}/postgres`;

export const E2E_DATABASE_URL = `${PG}/${E2E_DB_NAME}`;

/**
 * セッション Cookie の署名鍵。**Playwright 側とアプリのサーバー側で同じ値でないと、
 * 署名検証に落ちて「ログインしていない」扱いになる**（エラーは出ない）。
 * playwright.config.ts の webServer.env で同じ値を渡している。
 */
export const E2E_AUTH_SECRET =
  process.env.E2E_AUTH_SECRET ?? "e2e-secret-not-used-for-anything-real-0000";

/** 開発サーバー（3000）とずらす。`nr dev` を上げたまま E2E を回せるようにするため */
export const E2E_PORT = process.env.E2E_PORT ?? "3100";

export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
