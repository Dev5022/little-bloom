"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function signOut() {
    setBusy(true); setFailed(false);
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      router.refresh();
    } catch { setFailed(true); }
    finally { setBusy(false); }
  }
  return <div className="host-signout"><button className="host-button host-secondary" disabled={busy} onClick={() => void signOut()}>{busy ? "Signing out…" : "Sign out"}</button>{failed && <p role="alert">Could not sign out. Please try again.</p>}</div>;
}
