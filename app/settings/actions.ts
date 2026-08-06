"use server";

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { agentToken, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isUniqueViolation } from "@/lib/db-error";
import { validateHandle } from "@/lib/handle";
import { hashToken, newToken } from "@/lib/token";

/**
 * 未ログインは throw せず戻り値で返す。
 * throw するとクライアントには汎用のエラー画面しか出せず、
 * 他のパスが返す `{ error }` と扱いが揃わないため。
 */
async function currentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

const NOT_SIGNED_IN = { error: "ログインしてください" } as const;

export type ActionState = { error?: string; issuedToken?: string };

/**
 * handle は一度決めたら変更させない。
 * `/e/{handle}/{slug}` の URL が既に外に出ているため。
 */
export async function claimHandle(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await currentUser();
  if (!me) return NOT_SIGNED_IN;

  const current = await db.select({ handle: user.handle }).from(user).where(eq(user.id, me.id));
  if (current[0]?.handle) {
    return { error: "handle は変更できません" };
  }

  const result = validateHandle(form.get("handle"));
  if (!result.ok) return { error: result.error };

  const taken = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.handle, result.handle))
    .limit(1);
  if (taken.length > 0) {
    return { error: `@${result.handle} はすでに使われています` };
  }

  try {
    await db.update(user).set({ handle: result.handle }).where(eq(user.id, me.id));
  } catch (e) {
    // 上の存在チェックとの間に同じ handle を取られた場合だけ「使われています」にする。
    // 制約名まで見ているのは、接続断や権限エラーを取り違えないため。
    // それ以外は握り潰さず投げ直す（Next のエラーバウンダリで気づける）。
    if (isUniqueViolation(e, "user_handle_unique")) {
      return { error: `@${result.handle} はすでに使われています` };
    }
    throw e;
  }

  revalidatePath("/settings");
  return {};
}

/**
 * エージェント用トークンを発行する。
 * 平文を返すのはこの一回だけ。サーバは sha256 しか保持しない。
 */
export async function issueToken(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await currentUser();
  if (!me) return NOT_SIGNED_IN;

  const current = await db.select({ handle: user.handle }).from(user).where(eq(user.id, me.id));
  if (!current[0]?.handle) {
    return { error: "先に handle を決めてください" };
  }

  const label = String(form.get("label") ?? "").trim();
  if (!label) return { error: "ラベルを入れてください（どの端末用かの見分けに使います）" };
  if (label.length > 100) return { error: "ラベルが長すぎます" };

  const token = newToken();
  await db.insert(agentToken).values({
    userId: me.id,
    label,
    tokenHash: await hashToken(token),
  });

  revalidatePath("/settings");
  return { issuedToken: token };
}

/** 失効。行は消さずに revoked_at を入れる（いつ失効させたかを残すため） */
export async function revokeToken(_prev: ActionState, form: FormData): Promise<ActionState> {
  const me = await currentUser();
  if (!me) return NOT_SIGNED_IN;

  const id = String(form.get("id") ?? "");
  if (!id) return { error: "対象が指定されていません" };

  await db
    .update(agentToken)
    .set({ revokedAt: new Date() })
    // userId も条件に入れる。他人のトークン ID を投げられても消せないようにするため
    .where(and(eq(agentToken.id, id), eq(agentToken.userId, me.id), isNull(agentToken.revokedAt)));

  revalidatePath("/settings");
  return {};
}
