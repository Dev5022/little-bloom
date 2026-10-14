import type { Metadata } from "next";
import { getVerifiedUser, hostIsConfigured, isAuthorizedHost } from "@/lib/rsvp-server";
import GuestList from "./GuestList";
import LoginForm from "./LoginForm";
import SignOutButton from "./SignOutButton";
import "./host.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Host guest list · Little Bloom", robots: { index: false, follow: false } };

export default async function HostPage() {
  const ready = hostIsConfigured();
  let user = null;
  let unavailable = false;
  if (ready) {
    try { user = await getVerifiedUser(); }
    catch { unavailable = true; }
  }
  return <main className="host-page" lang="en"><div className="host-shell">
    <a className="host-back" href="/">← Back to the invitation</a>
    <header className="host-heading"><span className="host-eyebrow">A little celebration · Host space</span><h1>The little guest list</h1><p>Every yes, every loving wish, all in one place.</p></header>
    {!ready ? <section className="host-card host-login"><span aria-hidden="true">♡</span><h2>Your guest list is being prepared</h2><p>Supabase and the host account need to be configured before you can sign in.</p></section>
      : unavailable ? <section className="host-card host-login"><h2>Sign-in is temporarily unavailable</h2><p>Please try again in a moment.</p></section>
      : !user ? <section className="host-card host-login"><span aria-hidden="true">♡</span><h2>A private space for the host</h2><p>Sign in with your host email and password to view RSVPs and download the guest list.</p><LoginForm /></section>
      : !isAuthorizedHost(user) ? <section className="host-card host-login"><span aria-hidden="true">♡</span><h2>This guest list belongs to the host</h2><p>Please sign out and use the host account.</p><SignOutButton /></section>
      : <><SignOutButton /><GuestList /></>}
  </div></main>;
}
