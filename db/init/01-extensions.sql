-- drizzle-kit は拡張を作れないので migration には含まれない。
-- ローカルはコンテナの初回起動時にこれが流れる。Neon では手で一度実行すること。

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
