"use client";

import { useActionState } from "react";
import { DeleteEntryControl } from "@/components/delete-entry-control";
import { useSession } from "@/lib/auth-client";
import { type DeleteEntryState, deleteEntry } from "./actions";

const EMPTY: DeleteEntryState = {};

/**
 * 所有者にだけ削除の入口を出す。
 *
 * **セッションをクライアント側で引いているのは ISR を保つため。** このページは
 * revalidate 300 でプリレンダされるので、サーバー側で headers() を読むと
 * 丸ごと dynamic に落ちて、全員ぶんのレンダリングが毎回走る。
 *
 * ここでの判定は表示の出し分けでしかない。**実際に消せるかどうかは
 * actions.ts がサーバー側のセッションで決める**ので、ここを迂回されても消えない。
 */
export function DeleteEntry({ handle, slug }: { handle: string; slug: string }) {
  const { data: session, isPending } = useSession();
  const [state, action, pending] = useActionState(deleteEntry, EMPTY);

  // 取得中に出すと、他人のページでも一瞬ボタンが見える
  if (isPending) return null;

  // **決まったあとは data-owned を必ず残す。** これが無いと E2E から
  // 「まだセッションが来ていない」と「出さないと決めた」が見分けられず、
  // 出し分けが壊れても "ボタンが無い" として通ってしまう
  return (
    <div data-owned={session?.user.handle === handle} data-slot="delete-entry">
      {session?.user.handle === handle && (
        <DeleteEntryControl action={action} error={state.error} pending={pending} slug={slug} />
      )}
    </div>
  );
}
