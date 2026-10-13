// The statuses from the team's Google Sheet. Starts from the copy saved in the
// repository (refreshed every 3 hours by the website check), then swaps in the
// sheet as it is now, so edits show without waiting for a deploy.
import { useEffect, useState } from "react";
import SNAPSHOT from "./hivSheetSnapshot.json";
import { unpackRows } from "./hivSheet";

const saved = { rows: unpackRows(SNAPSHOT), fetchedAt: SNAPSHOT.fetchedAt, from: SNAPSHOT.from, live: false };
let request = null;

export function useHivStatuses() {
  const [state, setState] = useState(saved);
  useEffect(() => {
    let alive = true;
    if (!request) request = fetch("/api/hiv-statuses").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    request.then((d) => { if (alive && d?.rows?.length) setState({ rows: unpackRows(d), fetchedAt: d.fetchedAt, from: d.from, live: true }); });
    return () => { alive = false; };
  }, []);
  return state;
}
