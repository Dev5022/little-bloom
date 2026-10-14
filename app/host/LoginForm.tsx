"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email: String(values.get("email") ?? "").trim(), password: String(values.get("password") ?? ""),
      });
      if (result.error) throw new Error("Sign-in failed");
      router.refresh();
    } catch {
      setError("Sign-in failed. Check your host email and password, then try again.");
    } finally { setBusy(false); }
  }

  return <form className="host-login-form" onSubmit={signIn}>
    <fieldset disabled={busy}>
      <label htmlFor="host-email">Email</label>
      <input id="host-email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="host-password">Password</label>
      <input id="host-password" name="password" type="password" autoComplete="current-password" required />
      {error && <p className="host-login-error" role="alert">{error}</p>}
      <button className="host-button" type="submit">{busy ? "Signing in…" : "Sign in to your guest list"}</button>
    </fieldset>
  </form>;
}
