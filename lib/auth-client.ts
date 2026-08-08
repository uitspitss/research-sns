import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
// **型だけ。値として import しない。** lib/auth.ts は lib/db を掴んでいて、
// import した時点で DATABASE_URL を要求する（CLAUDE.md「定数を DB を掴む
// ファイルに置かない」）。`import type` は消えるのでブラウザには何も入らない。
import type { auth } from "./auth";

/**
 * additionalFields（handle）をクライアント側の型に乗せるためのプラグイン。
 * これが無いと `session.user.handle` が型に出ない（値は元から返ってきている）。
 */
const authClient = createAuthClient({
  plugins: [inferAdditionalFields<typeof auth>()],
});

export const { signIn, useSession } = authClient;
