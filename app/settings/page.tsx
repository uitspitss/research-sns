import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { agentToken, user } from "@/db/schema";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignInButton } from "./sign-in-button";
import { HandleForm, TokenList, TokenForm } from "./forms";

/** セッションを見るので静的化しない */
export const dynamic = "force-dynamic";

function SettingsHeading({ children }: { children?: React.ReactNode }) {
  return (
    <div className="pt-8">
      <h1 className="font-serif text-[22px] leading-[1.5] font-medium">設定</h1>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return (
      <main className="flex flex-col gap-5">
        <SettingsHeading />
        <Card>
          <CardHeader>
            <CardTitle>ログイン</CardTitle>
            <CardDescription>
              Google でログインすると、handle を取ってエージェント用のトークンを発行できます。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="accent">
              <AlertTitle>ログインは投稿経路ではありません</AlertTitle>
              <AlertDescription>
                投稿は発行したトークンを使った <code>POST /api/entries</code> と MCP サーバー（
                <code>/api/mcp</code>）だけです。
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <SignInButton />
          </CardFooter>
        </Card>
      </main>
    );
  }

  const [me] = await db
    .select({ handle: user.handle, name: user.name })
    .from(user)
    .where(eq(user.id, session.user.id));

  const tokens = await db
    .select({
      id: agentToken.id,
      label: agentToken.label,
      createdAt: agentToken.createdAt,
      lastUsedAt: agentToken.lastUsedAt,
      revokedAt: agentToken.revokedAt,
    })
    .from(agentToken)
    .where(eq(agentToken.userId, session.user.id))
    .orderBy(desc(agentToken.createdAt));

  return (
    <main className="flex flex-col gap-5">
      <SettingsHeading>
        <p className="font-mono text-[11.5px] tracking-[0.03em] text-muted-foreground">
          {me?.name}
        </p>
      </SettingsHeading>

      <Card>
        <CardHeader>
          <CardTitle>handle</CardTitle>
          <CardDescription>
            公開ページの URL になります。エントリの URL が既に外に出ているため、
            一度決めると変更できません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {me?.handle ? (
            <p>
              <strong>@{me.handle}</strong> — 公開ページは <code>/u/{me.handle}</code> です。
            </p>
          ) : (
            <HandleForm />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>エージェント用トークン</CardTitle>
          <CardDescription>
            MCP サーバー（<code>/api/mcp</code>）や CLI から <code>POST /api/entries</code>{" "}
            に使うトークンです。 発行時に一度だけ表示されます。サーバは sha256 しか保持しないので、
            失くしたら失効させて発行し直してください。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {me?.handle ? (
            <TokenForm />
          ) : (
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyTitle>先に handle を決めてください</EmptyTitle>
              </EmptyHeader>
            </Empty>
          )}
          <TokenList tokens={tokens} />
        </CardContent>
      </Card>
    </main>
  );
}
