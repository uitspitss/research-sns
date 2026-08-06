/**
 * 開発用のシードデータ。
 *
 *   nr db:seed
 *
 * 何度流しても同じ状態になるよう、対象ユーザーのエントリを先に消してから入れ直す。
 * 本番では絶対に流さないこと（NODE_ENV=production なら止まる）。
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { buildSearchText } from "@/lib/search-text";
import { agentToken, entry, user } from "@/db/schema";
import { hashToken } from "@/lib/token";

if (process.env.NODE_ENV === "production") {
  throw new Error("seed は本番では実行しない");
}

/** 開発中に curl で叩くための固定トークン。本番には存在しない値。 */
const DEV_TOKEN = "dev-token-0000000000000000000000000000";

const users = [
  { id: "seed-user-hoshino", handle: "hoshino", name: "星野", email: "hoshino@example.com" },
  { id: "seed-user-mikami", handle: "mikami", name: "三上", email: "mikami@example.com" },
];

const entries = [
  {
    userId: "seed-user-hoshino",
    slug: "2026-07-14-a1b2",
    title: "麦茶の作り方 → 江戸の水売り",
    trigger: "水出しと煮出しで麦茶の味が違う理由を調べていた",
    path: ["水出し麦茶", "軟水と硬水", "江戸の上水道", "水売りの天秤棒"],
    body: [
      "- 水出しと煮出しの差は温度より抽出時間の影響が大きい",
      "- 硬度が高いと渋みが立つ、と書いている資料が多いが出典が辿れない ※未確認",
      "- 江戸は井戸水が塩辛い土地が多く、上水道と水売りが併存していた",
      "- 水売りは天秤棒で一荷ずつ運び、価格は距離で決まった",
    ].join("\n"),
    twist: "「軟水がおいしい」は近代の言説で、江戸期は水そのものが商品だった",
    sources: ["https://example.com/edo-water", "https://example.com/mugicha"],
    loggedOn: "2026-07-14",
  },
  {
    userId: "seed-user-hoshino",
    slug: "2026-07-28-c3d4",
    title: "キーボードの配列 → タイプライターの機構",
    trigger: "QWERTY は本当に打鍵を遅くするための配列なのか",
    path: ["QWERTY", "Sholes の特許", "活字アームの絡まり", "電信オペレータ説"],
    body: [
      "- 「遅くするため」説は一次資料に当たらない",
      "- 活字アームの物理的な衝突を避ける配置、という説明のほうが機構と整合する",
      "- 電信のオペレータが受信効率のために要望した、という説もある ※未確認",
    ].join("\n"),
    twist: null,
    sources: ["https://example.com/qwerty-history"],
    loggedOn: "2026-07-28",
  },
  {
    userId: "seed-user-mikami",
    slug: "2026-08-02-e5f6",
    title: "アボカドの種 → 絶滅した大型動物",
    trigger: "アボカドの種が実に対して大きすぎる",
    path: ["アボカドの種", "種子散布", "巨大ナマケモノ", "更新世の大量絶滅"],
    body: [
      "- 果実は種子を運ぶ動物とセットで進化する",
      "- アボカドの種を丸呑みできる現生動物がアメリカ大陸にいない",
      "- より大型のナマケモノやゴンフォテリウムが担っていた、という仮説",
      "- 人間の栽培が無ければ分布を維持できなかった可能性がある",
    ].join("\n"),
    twist: "いま食べているアボカドは、散布者が絶滅したあと人間に拾われた果実",
    sources: ["https://example.com/anachronistic-fruit"],
    loggedOn: "2026-08-02",
  },
];

async function seed() {
  const userIds = users.map((u) => u.id);

  // 何度流しても同じ状態になるように、対象ユーザーの分だけ消してから入れる
  await db.delete(entry).where(inArray(entry.userId, userIds));
  await db.delete(agentToken).where(inArray(agentToken.userId, userIds));
  await db.delete(user).where(inArray(user.id, userIds));

  await db.insert(user).values(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: true,
      handle: u.handle,
    })),
  );

  await db.insert(entry).values(
    entries.map((e) => ({
      ...e,
      searchText: buildSearchText(e),
    })),
  );

  await db.insert(agentToken).values({
    userId: users[0].id,
    label: "seed の開発用トークン",
    tokenHash: await hashToken(DEV_TOKEN),
  });

  const [{ handle }] = await db
    .select({ handle: user.handle })
    .from(user)
    .where(eq(user.id, users[0].id));

  console.log(`seeded: ${users.length} users / ${entries.length} entries`);
  console.log(`\n@${handle} の開発用トークン:\n  ${DEV_TOKEN}\n`);
  console.log(`curl -X POST http://localhost:3000/api/entries \\
  -H "Authorization: Bearer ${DEV_TOKEN}" \\
  -H 'Content-Type: application/json' \\
  -d '{"title":"A → B","body":"- めも","path":["A","B"]}'`);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
