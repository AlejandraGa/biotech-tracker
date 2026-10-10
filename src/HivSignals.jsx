import { useCallback, useEffect, useMemo, useState } from "react";
import { FONT, INK, TEXT, MUTED, FAINT, LINE, HAIR, BRAND, COMPANY_COLOR, fmtDate } from "./ui";

// ─── WHAT THE USER HAS ALREADY REVIEWED (kept in this browser) ───────────────
const LS_KEY = "catalyst_hiv_reviewed_v1";
const FIRST_VISIT_DAYS = 14;

function loadReviewed() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function saveReviewed(ids) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ at: new Date().toISOString(), ids: ids.slice(0, 1500) })); } catch {}
}
const isoDaysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

// ClinicalTrials.gov sometimes refuses requests from servers; the browser can ask directly.
async function ctgovFromBrowser(since) {
  const p = new URLSearchParams();
  p.set("query.cond", "HIV Infections");
  p.set("query.spons", 'Gilead OR ViiV OR "Merck Sharp" OR Janssen OR GlaxoSmithKline');
  p.set("filter.advanced", `AREA[LastUpdatePostDate]RANGE[${since},MAX]`);
  p.set("sort", "LastUpdatePostDate:desc");
  p.set("pageSize", "40");
  p.set("fields", "NCTId,BriefTitle,LeadSponsorName,OverallStatus,Phase,PrimaryCompletionDate,LastUpdatePostDate");
  const res = await fetch(`https://clinicaltrials.gov/api/v2/studies?${p}`, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.studies || []).map((raw) => {
    const s = raw.protocolSection || {};
    const nct = s.identificationModule?.nctId;
    const date = s.statusModule?.lastUpdatePostDateStruct?.date || "";
    const phases = (s.designModule?.phases || []).join("/").replace(/PHASE/g, "Phase ").replace(/EARLY_/g, "Early ");
    const sponsor = s.sponsorCollaboratorsModule?.leadSponsor?.name || "";
    const completion = s.statusModule?.primaryCompletionDateStruct?.date;
    return {
      id: `ctgov-${nct}-${date}`, date, source: "ClinicalTrials.gov", kind: "trial", level: /3|4/.test(phases) ? "major" : "minor",
      product: "", company: sponsor,
      title: `${nct} record updated: ${s.identificationModule?.briefTitle || ""}`,
      detail: [phases, (s.statusModule?.overallStatus || "").replace(/_/g, " ").toLowerCase(), completion ? `primary completion ${completion}` : ""].filter(Boolean).join(" · "),
      url: `https://clinicaltrials.gov/study/${nct}`,
    };
  }).filter((x) => x.date && x.date >= since);
}

// ─── DATA HOOK ───────────────────────────────────────────────────────────────
export function useHivSignals() {
  const [state, setState] = useState({ status: "loading", signals: [], sources: [], generatedAt: "", live: null });
  const [reviewed, setReviewed] = useState(loadReviewed);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: "loading" }));
    try {
      const res = await fetch("/api/hiv-signals?days=90");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let { signals, sources } = data;
      const ct = sources.find((s) => s.name === "ClinicalTrials.gov");
      if (ct && !ct.ok) {
        try {
          const extra = await ctgovFromBrowser(data.since);
          signals = [...signals, ...extra].sort((a, b) => b.date.localeCompare(a.date));
          sources = sources.map((s) => (s.name === "ClinicalTrials.gov" ? { name: s.name, ok: true, count: extra.length } : s));
        } catch { /* keep the server's failure report */ }
      }
      setState({ status: "ready", signals, sources, generatedAt: data.generatedAt, live: data.live || null });
    } catch (e) {
      setState({ status: "error", signals: [], sources: [], generatedAt: "", live: null, error: e.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fresh = useMemo(() => {
    if (!reviewed) { const cut = isoDaysAgo(FIRST_VISIT_DAYS); return state.signals.filter((s) => s.date >= cut); }
    const seen = new Set(reviewed.ids);
    return state.signals.filter((s) => !seen.has(s.id));
  }, [state.signals, reviewed]);

  const markReviewed = useCallback(() => {
    const ids = state.signals.map((s) => s.id);
    saveReviewed(ids);
    setReviewed({ at: new Date().toISOString(), ids });
  }, [state.signals]);

  return { ...state, fresh, freshIds: useMemo(() => new Set(fresh.map((s) => s.id)), [fresh]), reviewedAt: reviewed?.at || "", markReviewed, reload: load };
}

// ─── SMALL PIECES ────────────────────────────────────────────────────────────
const SOURCE_TINT = { FDA: "#1e40af", EMA: "#0f766e", Swissmedic: "#b3122b", "Spezialitätenliste": "#b3122b", Press: "#6b6760", "ClinicalTrials.gov": "#6d28d9" };

function SourceTag({ name }) {
  return <span style={{ fontSize: 11.5, fontWeight: 600, color: SOURCE_TINT[name] || MUTED, whiteSpace: "nowrap" }}>{name}</span>;
}

function SignalRow({ s, isNew, dense }) {
  return (
    <a href={s.url} target="_blank" rel="noopener noreferrer" className="sig-row"
      style={{ display: "grid", gridTemplateColumns: "84px 132px minmax(0,1fr)", gap: 14, padding: dense ? "9px 16px" : "11px 16px", borderTop: `1px solid ${HAIR}`, textDecoration: "none", alignItems: "baseline" }}>
      <span style={{ fontSize: 12.5, color: MUTED, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{fmtDate(s.date)}</span>
      <SourceTag name={s.source} />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontSize: 13.5, color: INK, fontWeight: s.level === "major" ? 600 : 400, lineHeight: 1.45 }}>
          {isNew && <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: BRAND, marginRight: 8, verticalAlign: 2 }} aria-label="New" />}
          {s.title}
        </span>
        {(s.company || s.detail) && (
          <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2, lineHeight: 1.45 }}>
            {s.company && <><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 3, background: COMPANY_COLOR[s.company] || "#bbb", marginRight: 6, verticalAlign: 1 }} />{s.company}</>}
            {s.company && s.detail ? " · " : ""}{s.detail}
          </span>
        )}
      </span>
    </a>
  );
}

export function SourceHealth({ sources, generatedAt, onReload, loading }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: MUTED }}>
      {sources.map((s) => (
        <span key={s.name} title={s.ok ? `${s.count} items in the last 90 days` : `Did not respond: ${s.error}`} style={{ whiteSpace: "nowrap" }}>
          <span style={{ color: s.ok ? "#166534" : "#b3122b", marginRight: 4 }}>{s.ok ? "✓" : "✕"}</span>{s.name}
          <span style={{ color: FAINT }}> {s.ok ? s.count : "no response"}</span>
        </span>
      ))}
      {generatedAt && <span style={{ color: FAINT }}>Checked {new Date(generatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
      <button onClick={onReload} disabled={loading} style={{ border: "none", background: "none", color: INK, fontSize: 12, fontFamily: FONT, cursor: "pointer", textDecoration: "underline", padding: 0 }}>{loading ? "Checking…" : "Check again"}</button>
    </div>
  );
}

// ─── "WHAT CHANGED" PANEL ────────────────────────────────────────────────────
export function WhatChanged({ feed, onSeeAll }) {
  const { status, fresh, reviewedAt, markReviewed, sources, error } = feed;
  const key = fresh.filter((s) => s.level === "major");
  const routine = fresh.length - key.length;
  const shown = key.slice(0, 6);
  const failed = sources.filter((s) => !s.ok);

  const since = reviewedAt ? `since you last reviewed on ${fmtDate(reviewedAt)}` : `in the last ${FIRST_VISIT_DAYS} days`;

  return (
    <section style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, marginBottom: 22, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>
            {status === "loading" && "Checking sources for changes…"}
            {status === "error" && "Live monitoring is unavailable"}
            {status === "ready" && (key.length
              ? `${key.length} key update${key.length === 1 ? "" : "s"} ${since}`
              : `No key updates ${since}`)}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>
            {status === "error" && `The monitoring service did not respond (${error}). The status table below is unaffected.`}
            {status === "ready" && (routine > 0 ? `Plus ${routine} routine update${routine === 1 ? "" : "s"} (label changes, early-phase trial records, general news).` : "Regulators, company news and trial records are checked automatically.")}
          </div>
        </div>
        {status === "ready" && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onSeeAll} style={btn(false)}>Full activity log</button>
            {fresh.length > 0 && <button onClick={markReviewed} style={btn(true)}>Mark as reviewed</button>}
          </div>
        )}
      </div>
      {status === "ready" && shown.map((s) => <SignalRow key={s.id} s={s} dense />)}
      {status === "ready" && key.length > shown.length && (
        <button onClick={onSeeAll} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", borderTop: `1px solid ${HAIR}`, background: "none", fontFamily: FONT, fontSize: 12.5, color: MUTED, cursor: "pointer" }}>
          {key.length - shown.length} more key update{key.length - shown.length === 1 ? "" : "s"} in the activity log
        </button>
      )}
      {status === "ready" && failed.length > 0 && (
        <div style={{ padding: "9px 16px", borderTop: `1px solid ${HAIR}`, fontSize: 12, color: "#92580a", background: "#fdfaf3" }}>
          Not checked just now: {failed.map((f) => f.name).join(", ")}. Changes from {failed.length === 1 ? "this source" : "these sources"} may be missing.
        </div>
      )}
    </section>
  );
}

const btn = (primary) => ({ padding: "7px 13px", borderRadius: 5, fontSize: 12.5, fontFamily: FONT, fontWeight: 500, cursor: "pointer", border: primary ? `1px solid ${INK}` : `1px solid #d3cec6`, background: primary ? INK : "#fff", color: primary ? "#fff" : TEXT, whiteSpace: "nowrap" });

// ─── FULL ACTIVITY LOG ───────────────────────────────────────────────────────
export function ActivityLog({ feed }) {
  const { status, signals, sources, freshIds, generatedAt, reload, error } = feed;
  const [source, setSource] = useState("All");
  const [keyOnly, setKeyOnly] = useState(true);
  const [q, setQ] = useState("");

  const names = ["All", ...sources.map((s) => s.name)];
  const rows = signals.filter((s) =>
    (source === "All" || s.source === source) &&
    (!keyOnly || s.level === "major") &&
    (!q || `${s.title} ${s.company} ${s.product} ${s.detail}`.toLowerCase().includes(q.toLowerCase()))
  );

  if (status === "error") {
    return <div style={{ padding: 20, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 13.5, color: TEXT }}>The monitoring service did not respond ({error}). <button onClick={reload} style={{ border: "none", background: "none", textDecoration: "underline", cursor: "pointer", fontFamily: FONT, fontSize: 13.5, padding: 0 }}>Try again</button></div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {names.map((n) => (
            <button key={n} onClick={() => setSource(n)} style={{ padding: "6px 12px", borderRadius: 5, fontSize: 12.5, fontFamily: FONT, cursor: "pointer", border: source === n ? `1px solid ${INK}` : `1px solid #d3cec6`, background: source === n ? INK : "#fff", color: source === n ? "#fff" : TEXT }}>{n}</button>
          ))}
          <label style={{ fontSize: 12.5, color: TEXT, display: "inline-flex", gap: 6, alignItems: "center", marginLeft: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={keyOnly} onChange={(e) => setKeyOnly(e.target.checked)} /> Key updates only
          </label>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by product, company or keyword" aria-label="Filter activity"
          style={{ flex: "1 1 220px", maxWidth: 320, padding: "7px 11px", border: `1px solid #d3cec6`, borderRadius: 5, fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff" }} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ padding: "11px 16px" }}>
          <SourceHealth sources={sources} generatedAt={generatedAt} onReload={reload} loading={status === "loading"} />
        </div>
        {status === "loading" && signals.length === 0 && <div style={{ padding: "18px 16px", borderTop: `1px solid ${HAIR}`, fontSize: 13, color: MUTED }}>Checking sources…</div>}
        {status === "ready" && rows.length === 0 && <div style={{ padding: "18px 16px", borderTop: `1px solid ${HAIR}`, fontSize: 13, color: MUTED }}>No activity matches these filters in the last 90 days.</div>}
        {rows.map((s) => <SignalRow key={s.id} s={s} isNew={freshIds.has(s.id)} />)}
      </div>
      <p style={{ fontSize: 12, color: FAINT, marginTop: 10, lineHeight: 1.55 }}>
        Covers the last 90 days. Items are collected automatically from openFDA, the EMA medicines dataset and news feed, Swissmedic's list of newly authorised medicines, the Swiss Spezialitätenliste, company and trade news, and ClinicalTrials.gov. A red dot marks items you have not reviewed. Open the source before relying on an item.
      </p>
    </div>
  );
}
