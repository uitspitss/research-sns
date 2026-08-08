"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { deleteOwnEntry } from "@/lib/entries";

export type DeleteEntryState = { error?: string };

/**
 * 自分の経路を消す。**削除の入口はここだけ。** REST も MCP も削除を持たない
 * （エージェント用トークンは追記しかできない鍵のままにしてある）。
 *
 * 未ログインは throw せず戻り値で返す。app/settings/actions.ts と揃えてある。
 */
export async function deleteEntry(
  _prev: DeleteEntryState,
  form: FormData,
): Promise<DeleteEntryState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "ログインしてください" };

  const slug = String(form.get("slug") ?? "");
  if (!slug) return { error: "対象が指定されていません" };

  // セッションの handle は使わない。handle を取る前に作られたセッションが
  // 残っていると null のままで、revalidate 先を組み立てられない
  const [me] = await db
    .select({ handle: user.handle })
    .from(user)
    .where(eq(user.id, session.user.id));

  // 投稿には handle が要る（lib/token.ts）ので、handle が無い人にエントリは無い
  if (!me?.handle) return { error: "この経路は削除できません" };

  const deleted = await deleteOwnEntry(session.user.id, slug);
  if (!deleted) return { error: "この経路は削除できません" };

  // 消したものが ISR のページに残り続けないようにする。
  // /search は force-dynamic なので要らない
  revalidatePath("/");
  revalidatePath(`/u/${me.handle}`);
  revalidatePath(`/e/${me.handle}/${slug}`);

  redirect(`/u/${me.handle}`);
}
