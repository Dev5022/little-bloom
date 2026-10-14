import type { Metadata } from "next";
import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { hostIsConfigured, isAuthorizedHost } from "@/lib/rsvp-server";
import GuestList from "./GuestList";
import "./host.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Host guest list · Little Bloom",
  robots: { index: false, follow: false },
};

export default async function HostPage() {
  const user = await getChatGPTUser();
  const ready = hostIsConfigured();
  const authorized = isAuthorizedHost(user);

  return (
    <main className="host-page" lang="en">
      <div className="host-shell">
        <a className="host-back" href="/">← Back to the invitation</a>
        <header className="host-heading">
          <span className="host-eyebrow">A little celebration · Host space</span>
          <h1>The little guest list</h1>
          <p>Every yes, every loving wish, all in one place.</p>
        </header>
        {!ready ? (
          <section className="host-card host-login"><span aria-hidden="true">♡</span>
            <h2>Your guest list is being prepared</h2>
            <p>Please try again soon.</p>
          </section>
        ) : !user ? (
          <section className="host-card host-login"><span aria-hidden="true">♡</span>
            <h2>A private space for the host</h2>
            <p>Sign in with the host’s ChatGPT account to view RSVPs and download the guest list.</p>
            <a className="host-button" href={chatGPTSignInPath("/host")} target="_top">Sign in with ChatGPT</a>
          </section>
        ) : !authorized ? (
          <section className="host-card host-login"><span aria-hidden="true">♡</span>
            <h2>This guest list belongs to the host</h2>
            <p>Please sign in with the account that created this invitation.</p>
            <a className="host-button" href={chatGPTSignOutPath("/host")} target="_top">Switch account</a>
          </section>
        ) : <GuestList />}
      </div>
    </main>
  );
}
