import { fn } from "storybook/test";

/**
 * Storybook 用の ./actions の差し替え。`.storybook/main.ts` の
 * research-sns:mock-server-actions プラグインが解決の段でここに向ける。
 *
 * 実体（actions.ts）は一切 import しない。あれを一度でも評価すると
 * lib/db 経由で pg がブラウザに持ち込まれて `Buffer is not defined` で落ちる。
 * **actions.ts に export を足したらここにも足すこと。**
 *
 * 既定は「成功して何も返さない」。エラーや発行済みトークンといった状態は
 * 各ストーリーの beforeEach で mockResolvedValue して作る。
 */
export const claimHandle = fn(async () => ({})).mockName("claimHandle");
export const issueToken = fn(async () => ({})).mockName("issueToken");
export const revokeToken = fn(async () => ({})).mockName("revokeToken");
