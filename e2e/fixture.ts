/**
 * E2E が前提にするデータ。`e2e/prepare-db.ts` が投入する。
 *
 * **`db/seed.ts` を流用しない。** seed は開発中に読んで気持ちがいいデータであって、
 * 変わるたびに E2E が落ちてよいものではない。E2E は自分が必要とするものだけを持つ。
 */
export const E2E_USER = {
  id: "e2e-user-with-handle",
  name: "E2E 実行者",
  email: "e2e@example.test",
  handle: "e2etester",
} as const;

/** handle 未設定の状態（/settings の handle 設定フォーム）を確かめるためのユーザー */
export const E2E_USER_NO_HANDLE = {
  id: "e2e-user-no-handle",
  name: "E2E 実行者（handle 未設定）",
  email: "e2e-no-handle@example.test",
} as const;

/** POST /api/entries 用。ハッシュだけが DB に入る */
export const E2E_AGENT_TOKEN = "e2e-token-00000000000000000000000000";

export const E2E_ENTRIES = [
  {
    slug: "2026-01-05-aa01",
    title: "打ち上げ花火 → 江戸の火薬職人",
    trigger: "花火の色がどうやって決まるのか気になった",
    path: ["炎色反応", "ストロンチウム", "硝石の輸入", "江戸の火薬職人"],
    body: ["- 色は金属塩の炎色反応で決まる", "- 硝石は国内で採れず輸入に頼っていた"].join("\n"),
    twist: "花火の技術は祭りではなく軍事から降りてきた",
    sources: ["https://example.com/hanabi"],
    loggedOn: "2026-01-05",
  },
  {
    slug: "2026-01-09-bb02",
    title: "回転寿司 → 工場のベルトコンベア",
    trigger: "回転寿司のレーンはどこから来たのか",
    path: ["回転寿司", "ビール工場の見学", "ベルトコンベア", "フォード式生産"],
    body: [
      "- 発案者はビール工場の製造ラインを見て思いついた",
      "- 皿の間隔は人の視線の移動速度から決めている ※未確認",
    ].join("\n"),
    twist: null,
    sources: [],
    loggedOn: "2026-01-09",
  },
] as const;
