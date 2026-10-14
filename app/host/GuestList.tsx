"use client";

import { useCallback, useEffect, useState } from "react";
import { guestListCsv, type GuestResponse } from "@/lib/rsvp-export";

type GuestListPage = { rsvps: GuestResponse[]; nextCursor: string | null; error?: string };

export default function GuestList() {
  const [rows, setRows] = useState<GuestResponse[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setBusy(true);
    setError("");
    try {
      const all: GuestResponse[] = [];
      let cursor: string | null = null;
      do {
        const response = await fetch(`/api/host/rsvps${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, {
          cache: "no-store", credentials: "same-origin", signal,
        });
        const result = await response.json() as GuestListPage;
        if (!response.ok) throw new Error(result.error || "The guest list could not be loaded.");
        if (!Array.isArray(result.rsvps)) throw new Error("The guest list could not be read.");
        all.push(...result.rsvps);
        cursor = result.nextCursor;
      } while (cursor);
      if (!signal?.aborted) {
        setRows(Array.from(new Map(all.map(row => [row.id, row])).values()));
        setLoaded(true);
      }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : "Please try again.");
    } finally {
      if (!signal?.aborted) setBusy(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function download() {
    const url = URL.createObjectURL(new Blob([guestListCsv(rows)], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `baby-shower-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const attending = rows.filter(row => row.attendance === "yes");
  const guestCount = attending.reduce((count, row) => count + row.guests, 0);

  return <>
    <div className="host-stats" aria-label="RSVP totals">
      <div className="host-card"><strong>{rows.length}</strong><span>Responses</span></div>
      <div className="host-card"><strong>{guestCount}</strong><span>Guests attending</span></div>
      <div className="host-card"><strong>{rows.length - attending.length}</strong><span>Unable to attend</span></div>
    </div>
    <section className="host-card host-list" aria-busy={busy}>
      <div className="host-toolbar"><div><h2>RSVPs & loving wishes</h2><p>Guest totals include the person responding.</p></div>
        <div className="host-actions"><button className="host-button host-secondary" disabled={busy} onClick={() => void load()}>Refresh</button>
          <button className="host-button" disabled={busy || !loaded || !rows.length} onClick={download}>Download CSV</button></div>
      </div>
      {error && <p className="host-error" role="alert">{error}</p>}
      {busy && <p className="host-empty" role="status">Gathering your little guest list…</p>}
      {!busy && loaded && !rows.length && <div className="host-empty"><span aria-hidden="true">♡</span><h3>The first little yes is on its way</h3><p>Responses will appear here when guests send their RSVP.</p></div>}
      {rows.length > 0 && <div className="host-table-wrap"><table><caption className="host-sr-only">Baby shower RSVP responses</caption><thead><tr><th scope="col">Guest</th><th scope="col">Attendance</th><th scope="col">Guests</th><th scope="col">Wishes</th><th scope="col">Received</th></tr></thead>
        <tbody>{rows.map(row => <tr key={row.id}><th scope="row">{row.name}</th><td><span className={`host-badge ${row.attendance === "yes" ? "host-yes" : "host-no"}`}>{row.attendance === "yes" ? "Attending" : "Unable to attend"}</span></td><td>{row.guests}</td><td className="host-wishes">{row.message || "—"}</td><td className="host-date">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</td></tr>)}</tbody></table></div>}
    </section>
  </>;
}
