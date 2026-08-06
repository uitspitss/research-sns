"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signIn } from "@/lib/auth-client";

export function SignInButton() {
  const [busy, setBusy] = useState(false);

  return (
    <Button
      disabled={busy}
      onClick={() => {
        setBusy(true);
        signIn.social({ provider: "google", callbackURL: "/settings" });
      }}
      type="button"
    >
      {busy ? "リダイレクト中…" : "Google でログイン"}
    </Button>
  );
}
