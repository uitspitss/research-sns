"use client";

import { useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { HANDLE_RULE } from "@/lib/handle";
import { cn } from "@/lib/utils";
import { type ActionState, claimHandle, issueToken, revokeToken } from "./actions";

const EMPTY: ActionState = {};

export function HandleForm() {
  const [state, action, pending] = useActionState(claimHandle, EMPTY);

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={state.error ? "true" : undefined}>
          <FieldLabel htmlFor="handle">handle</FieldLabel>
          <Input
            aria-invalid={!!state.error}
            id="handle"
            name="handle"
            placeholder="yourname"
            required
          />
          <FieldDescription>{HANDLE_RULE}。あとから変更できません。</FieldDescription>
          <FieldError>{state.error}</FieldError>
        </Field>
        <Field orientation="horizontal">
          <Button disabled={pending} type="submit">
            {pending ? "設定中…" : "この handle にする"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

export function TokenForm() {
  const [state, action, pending] = useActionState(issueToken, EMPTY);

  return (
    <form action={action}>
      <FieldGroup>
        <Field data-invalid={state.error ? "true" : undefined}>
          <FieldLabel htmlFor="label">ラベル</FieldLabel>
          <Input
            aria-invalid={!!state.error}
            id="label"
            name="label"
            placeholder="laptop の Claude Code"
            required
          />
          <FieldDescription>どの端末用かの見分けに使います。</FieldDescription>
          <FieldError>{state.error}</FieldError>
        </Field>
        <Field orientation="horizontal">
          <Button disabled={pending} type="submit">
            {pending ? "発行中…" : "トークンを発行"}
          </Button>
        </Field>
        {state.issuedToken && (
          <Alert variant="accent">
            <AlertTitle>この画面を離れると二度と表示されません</AlertTitle>
            <AlertDescription className="text-foreground">
              いま控えてください。
              <code className="mt-1.5 block break-all">{state.issuedToken}</code>
            </AlertDescription>
          </Alert>
        )}
      </FieldGroup>
    </form>
  );
}

type TokenRow = {
  id: string;
  label: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
};

export function TokenList({ tokens }: { tokens: TokenRow[] }) {
  const [state, action, pending] = useActionState(revokeToken, EMPTY);

  if (tokens.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyTitle>発行済みのトークンはありません</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>失効させられませんでした</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      <ItemGroup>
        {tokens.map((t) => (
          <Item className={cn(t.revokedAt && "opacity-60")} key={t.id} variant="outline">
            <ItemContent>
              <ItemTitle>{t.label}</ItemTitle>
              <ItemDescription>
                発行 {fmt(t.createdAt)}
                {t.lastUsedAt ? ` / 最終使用 ${fmt(t.lastUsedAt)}` : " / 未使用"}
                {t.revokedAt ? ` / 失効 ${fmt(t.revokedAt)}` : ""}
              </ItemDescription>
            </ItemContent>
            {!t.revokedAt && (
              <ItemActions>
                <form action={action}>
                  <input name="id" type="hidden" value={t.id} />
                  <Button disabled={pending} size="sm" type="submit" variant="outline">
                    失効させる
                  </Button>
                </form>
              </ItemActions>
            )}
          </Item>
        ))}
      </ItemGroup>
    </div>
  );
}

const fmt = (d: Date) => new Date(d).toISOString().slice(0, 10);
