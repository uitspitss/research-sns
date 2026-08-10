"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * 経路を削除するための2段階の確認。**見た目と段取りだけを持つ。**
 *
 * セッションも Server Action も掴まないので、happy-dom でも storybook でも
 * そのまま置ける。所有者かどうかの判定と実際の削除は呼び出し側
 * （app/e/[handle]/[slug]/delete-entry.tsx と同 actions.ts）の責務。
 *
 * 1クリックで送信しないのは、削除が取り消せないため。native の confirm() を
 * 使わないのは、ダイアログが出ている間ブラウザのイベントが止まるのと、
 * テストから踏めなくなるため。
 */
export function DeleteEntryControl({
  slug,
  action,
  pending,
  error,
}: {
  slug: string;
  action: (formData: FormData) => void;
  pending: boolean;
  error?: string | undefined;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mt-10 border-t pt-5">
      {error && (
        <Alert className="mb-3" variant="destructive">
          <AlertTitle>削除できませんでした</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {confirming ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            削除すると元に戻せません。この URL は 404 になり、同じ内容を投稿し直しても別の slug
            になります。
          </p>
          <div className="flex gap-2">
            {/* 送るのは slug だけ。誰のものかはサーバー側のセッションで決める */}
            <form action={action}>
              <input name="slug" type="hidden" value={slug} />
              <Button disabled={pending} size="sm" type="submit" variant="destructive">
                {pending ? "削除中…" : "削除する"}
              </Button>
            </form>
            <Button
              disabled={pending}
              onClick={() => setConfirming(false)}
              size="sm"
              type="button"
              variant="outline"
            >
              やめる
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setConfirming(true)} size="sm" type="button" variant="outline">
          この経路を削除
        </Button>
      )}
    </div>
  );
}
