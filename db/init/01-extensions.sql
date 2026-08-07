-- drizzle-kit は拡張を作れないので migration には含まれない。
-- ローカルはコンテナの初回起動時にこれが流れる。Neon では手で一度実行すること。
--
-- **migration より先に流す必要がある。** 0000 の entry_search_idx が
-- gin_trgm_ops を使うので、pg_trgm が無いと migration 自体が落ちる。
--
-- pgcrypto は入れない。使い道は gen_random_uuid() だけで、これは PostgreSQL 13 以降
-- コアの組み込み関数（ローカルは postgres:18、Neon も 14 以降）。

create extension if not exists pg_trgm;
