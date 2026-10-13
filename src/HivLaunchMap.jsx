// HivLaunchMap.jsx — the "Launch map" tab: where each HIV asset is authorised and
// reimbursed, market by market, with dates. Three views share one set of filters:
// one product across markets, all products in one market, and a product × market grid.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { AGENCIES, STATUS } from "./hivRegulatoryData";
import { ACCESS_BODIES, EXTRA_REGULATORS, ACCESS_STATUS } from "./hivAccessData";
import { BASE as CURATED, applyDetections } from "./hivData";
import AUTO from "./hivAutoDetections.json";
import { applyLive } from "./liveStatus";
import { useHivSignals } from "./HivSignals";
import MultiSelect from "./MultiSelect";
import { FONT, INK, TEXT, MUTED, FAINT, LINE, HAIR, PAPER, COMPANY_COLOR, fmtDate, todayIso } from "./ui";

const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json";
const ALL_STATUS = { ...STATUS, ...ACCESS_STATUS };
const BODY = Object.fromEntries([...AGENCIES, { key: "mhra", label: "MHRA" }, ...EXTRA_REGULATORS, ...ACCESS_BODIES].map((b) => [b.key, b.label]));
const shortBody = (k) => BODY[k].split(" · ")[0];
const BASE = applyDetections(CURATED, AUTO);

// One row per market we track. `id` is the ISO 3166 numeric code used by world-atlas,
// `reg` the regulator columns (first one decides; EU members fall back to the CHMP opinion),
// `access` the reimbursement bodies, `area` the region filter, `at` where the label sits on the map.
const MARKETS = [
  { id: 840, name: "United States", short: "US", area: "North America", panel: "na", reg: ["fda"], access: [], at: [-99, 39] },
  { id: 124, name: "Canada", short: "CA", area: "North America", panel: "na", reg: ["hc"], access: ["cda"], at: [-102, 55] },
  { id: 276, name: "Germany", short: "DE", area: "DACH", panel: "eu", reg: ["ec", "chmp"], access: ["gba"], at: [10.3, 51.2] },
  { id: 756, name: "Switzerland", short: "CH", area: "DACH", panel: "eu", reg: ["ch"], access: ["sl"], at: [8.1, 46.85] },
  { id: 40, name: "Austria", short: "AT", area: "DACH", panel: "eu", reg: ["ec", "chmp"], access: ["eko"], at: [14.6, 47.6] },
  { id: 826, name: "United Kingdom", short: "UK", area: "UK & Ireland", panel: "eu", reg: ["mhra"], access: ["nice", "smc"], at: [-1.6, 52.6] },
  { id: 372, name: "Ireland", short: "IE", area: "UK & Ireland", panel: "eu", reg: ["ec", "chmp"], access: ["ie"], at: [-8, 53.2] },
  { id: 250, name: "France", short: "FR", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["has"], at: [2.4, 46.7] },
  { id: 380, name: "Italy", short: "IT", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["it"], at: [12.4, 42.9] },
  { id: 724, name: "Spain", short: "ES", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["es"], at: [-3.6, 40.2] },
  { id: 620, name: "Portugal", short: "PT", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["pt"], at: [-8.1, 39.6] },
  { id: 528, name: "Netherlands", short: "NL", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["nl"], at: [5.7, 52.3] },
  { id: 56, name: "Belgium", short: "BE", area: "Rest of EU", panel: "eu", reg: ["ec", "chmp"], access: ["be"], at: [4.6, 50.6] },
  { id: 208, name: "Denmark", short: "DK", area: "Nordics", panel: "eu", reg: ["ec", "chmp"], access: ["dk"], at: [9.2, 56.1] },
  { id: 752, name: "Sweden", short: "SE", area: "Nordics", panel: "eu", reg: ["ec", "chmp"], access: ["se"], at: [15.2, 62.6] },
  { id: 578, name: "Norway", short: "NO", area: "Nordics", panel: "eu", reg: ["ec", "chmp"], access: ["no"], at: [9.4, 61.3] },
  { id: 36, name: "Australia", short: "AU", area: "Australia", panel: "au", reg: ["tga"], access: ["pbac"], at: [134, -25] },
];
const BY_ID = Object.fromEntries(MARKETS.map((m) => [m.id, m]));
const AREAS = [...new Set(MARKETS.map((m) => m.area))];
const COMPANIES = ["Gilead", "ViiV", "MSD", "J&J"];

// Progress steps, furthest first. Colour is a single green ramp with amber for review,
// matching the status colours used in the table; the label always travels with it.
const LEVELS = {
  reimbursed: { label: "Reimbursed", hint: "Authorised, and listed, funded or recommended by at least one reimbursement body", fill: "#2d7a4b", ink: "#fff" },
  approved: { label: "Authorised", hint: "Authorised by the regulator, no positive reimbursement decision on record yet", fill: "#9fcbab", ink: INK },
  review: { label: "Under review", hint: "Filed with the regulator, or a positive opinion awaiting the final decision", fill: "#e9bd6b", ink: INK },
  none: { label: "Not filed", hint: "No filing found, filing planned, or not authorised", fill: "#d6cfc2", ink: TEXT },
  unknown: { label: "Not verified", hint: "Status not confirmed for this market", fill: "#d6cfc2", ink: TEXT },
};
const LEVEL_ORDER = ["reimbursed", "approved", "review", "none", "unknown"];
const UNTRACKED = "#eceae5";
const HATCH = "repeating-linear-gradient(135deg,#d6cfc2 0 2px,#fff 2px 5px)";
const WAIT_HATCH = `repeating-linear-gradient(135deg, ${LEVELS.approved.fill} 0 4px, #fff 4px 7px)`;
const REIMBURSED = ["favourable", "listed", "restricted", "limited"];
// In Germany statutory insurance covers a product from launch; the G-BA verdict, even "no added
// benefit", only sets the negotiated price. A completed assessment therefore means it is reimbursed.
const covers = (k, c) => REIMBURSED.includes(c?.s) || (k === "gba" && c?.s === "noadded");

const regLevel = (c) => {
  const s = c?.s || "none";
  if (s === "approved") return "approved";
  if (s === "review" || s === "positive" || s === "pending") return "review";
  if (s === "none" && /not verified/i.test(c?.note || "")) return "unknown";
  return "none";
};

// Where one product stands in one market: the regulatory step, lifted to "reimbursed"
// once the product is authorised and any of the market's bodies lists or recommends it.
function progressOf(p, m) {
  const regs = m.reg.map((k) => ({ key: k, cell: p.reg?.[k] }));
  // The Commission decision rules for EU markets; before it exists, the CHMP opinion shows the step.
  const lead = regs.find((r) => regLevel(r.cell) !== "none" && regLevel(r.cell) !== "unknown") || regs[0];
  const access = m.access.map((k) => ({ key: k, cell: p.access?.[k] }));
  let level = regLevel(lead.cell);
  if (level === "approved" && access.some((a) => covers(a.key, a.cell))) level = "reimbursed";
  return { level, lead, regs, access };
}

const statusOf = (cell) => (cell?.label ? { ...ALL_STATUS[cell.s], label: cell.label } : ALL_STATUS[cell?.s || "none"]);

const FLAG = (m) => `https://flagcdn.com/w40/${m.short === "UK" ? "gb" : m.short.toLowerCase()}.png`;
const MONTH_MS = 30.44 * 86400000;
const monthsBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / MONTH_MS));
const shortDate = (iso) => { const [y, m] = iso.split("-").map(Number); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]} ${y}`; };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const h = s.length >> 1; return s.length % 2 ? s[h] : Math.round((s[h - 1] + s[h]) / 2); };

// The launch facts for one product in one market: authorisation date, first reimbursement
// decision, and, when there is none, why (no body tracked, not verified, negative, still waiting).
function launchOf(p, m, today) {
  const pr = progressOf(p, m);
  const approved = pr.level === "approved" || pr.level === "reimbursed";
  const a = approved ? pr.lead.cell?.date : null;
  const paid = pr.access.filter((x) => covers(x.key, x.cell));
  const first = paid.filter((x) => x.cell.date).sort((x, y) => x.cell.date.localeCompare(y.cell.date))[0];
  // A decision dated before the authorisation (a pre-launch listing) counts from the authorisation.
  const r = first ? (a && first.cell.date < a ? a : first.cell.date) : null;
  const negative = pr.access.find((x) => ["unfavourable", "noadded"].includes(x.cell?.s) && !covers(x.key, x.cell));
  const unverified = pr.access.length > 0 && pr.access.every((x) => x.cell?.s === "none" && /not verified/i.test(x.cell?.note || ""));
  const gap = approved && !paid.length ? (!pr.access.length ? "untracked" : negative ? "negative" : unverified ? "unverified" : "waiting") : null;
  return {
    p, m, pr, a, r, approved, gap, negative,
    rKey: first?.key, paidNoDate: !first && paid.length > 0,
    toPay: a && r ? monthsBetween(a, r) : null,
    waiting: gap === "waiting" && a ? monthsBetween(a, today) : null,
  };
}

// One sentence on where things stand, used in the side note and the detail panel.
function outcomeText(x) {
  if (x.r) return { strong: `${plural(x.toPay, "month")}`, rest: ` to ${shortBody(x.rKey)}` };
  if (x.paidNoDate) return { rest: x.a ? "Reimbursed, date not recorded" : "Authorised and reimbursed, dates not recorded" };
  if (x.gap === "untracked") return { rest: "No reimbursement body tracked" };
  if (x.gap === "unverified") return { rest: "Reimbursement not verified" };
  if (x.gap === "negative") { const n = statusOf(x.negative.cell); return { strong: n.label, color: n.color, rest: ` (${shortBody(x.negative.key)})` }; }
  if (x.waiting !== null) return { strong: `Waiting ${plural(x.waiting, "month")}`, color: "#92580a" };
  if (x.approved) return { rest: "Authorised, date not recorded" };
  return { rest: LEVELS[x.pr.level].label, color: x.pr.level === "review" ? "#92580a" : FAINT };
}

// The atlas is fetched once per page load and shared by every mount.
let atlasPromise = null;
const loadAtlas = () => {
  if (!atlasPromise) {
    atlasPromise = fetch(ATLAS_URL)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((topo) => feature(topo, topo.objects.countries).features)
      .catch((e) => { atlasPromise = null; throw e; });
  }
  return atlasPromise;
};

// The world map: one Natural Earth projection in a fixed box, and the places the
// shortcut buttons jump to (a lon/lat box each; `panel` picks the starting place).
const W = 960, H = 520, K_MAX = 24;
const PROJ = geoNaturalEarth1().fitExtent([[0, 0], [W, H]], { type: "Sphere" });
const SPHERE = geoPath(PROJ).bounds({ type: "Sphere" });
const PLACES = [
  { name: "Europe", panel: "eu", box: [[-11, 71], [32, 35]] },
  { name: "North America", panel: "na", box: [[-128, 62], [-60, 22]] },
  { name: "Australia", panel: "au", box: [[110, -9], [156, -45]] },
  { name: "World", panel: null, box: [[-170, 75], [180, -50]] },
];

// ─── PIECES ──────────────────────────────────────────────────────────────────
function StatusText({ def, size = 12.5 }) {
  if (!def?.label) return null;
  return <span style={{ color: def.color, fontSize: size, fontWeight: 600 }}><span aria-hidden="true" style={{ marginRight: 5 }}>{def.glyph}</span>{def.label}</span>;
}

function SourceLink({ href }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 12, color: MUTED, textDecoration: "underline", textUnderlineOffset: 2, whiteSpace: "nowrap" }}>Source</a>;
}

function Swatch({ level, size = 11 }) {
  const l = LEVELS[level];
  const fill = level === "unknown" ? { backgroundImage: HATCH } : { background: l.fill };
  return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0, ...fill }} />;
}

function Flag({ m }) {
  return <img src={FLAG(m)} alt="" width={20} height={15} loading="lazy" style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)", objectFit: "cover", flexShrink: 0, background: HAIR }} />;
}

function CompanyDot({ company }) {
  return <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: COMPANY_COLOR[company] || "#bbb", flexShrink: 0 }} />;
}

// A product in one line, to recognise it without remembering the brand name.
const aboutOf = (p) => [p.inn, p.klass, p.dosing].filter(Boolean).join(" · ");
const companyOf = (p) => p.company.replace("ViiV Healthcare", "ViiV");

function ProductCard({ p }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: "10px 14px", margin: "-2px 0 14px", display: "grid", gap: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 13 }}>
        <strong style={{ color: INK, fontWeight: 600 }}>{p.name}</strong>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED, fontSize: 12.5 }}><CompanyDot company={p.company} />{p.company}</span>
        <span style={{ fontSize: 11.5, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 4, padding: "0 6px" }}>{p.segment === "PrEP" ? "Prevention (PrEP)" : "Treatment"}</span>
        <span style={{ fontSize: 11.5, color: MUTED, border: `1px solid ${LINE}`, borderRadius: 4, padding: "0 6px" }}>{p.stage}</span>
      </div>
      <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.5 }}>
        <span style={{ color: MUTED }}>Compound</span> {p.inn}<span style={{ color: "#cfcac2", margin: "0 7px" }}>·</span>
        <span style={{ color: MUTED }}>Class</span> {p.klass}<span style={{ color: "#cfcac2", margin: "0 7px" }}>·</span>
        <span style={{ color: MUTED }}>Regimen</span> {p.dosing}
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="lm-seg" style={{ display: "inline-flex", flexWrap: "wrap", maxWidth: "100%", border: "1px solid #d3cec6", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
      {options.map((o, i) => (
        <button key={o.value} onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          style={{ padding: "6px 13px", fontSize: 12.5, fontFamily: FONT, cursor: "pointer", border: "none", borderLeft: i ? "1px solid #d3cec6" : "none", background: value === o.value ? INK : "#fff", color: value === o.value ? "#fff" : TEXT, fontWeight: value === o.value ? 500 : 400 }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Picker({ label, value, onChange, children }) {
  return (
    <label className="lm-pick" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: MUTED, maxWidth: "100%" }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ fontFamily: FONT, fontSize: 13, color: INK, fontWeight: 600, padding: "6px 8px", border: "1px solid #d3cec6", borderRadius: 6, background: "#fff", maxWidth: 300, minWidth: 0 }}>
        {children}
      </select>
    </label>
  );
}

// One decision: body, status, date, and optionally the note and source.
function Decision({ k, cell, full }) {
  const c = cell || { s: "none" };
  const quiet = c.s === "none" || c.s === "pending";
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.45, minWidth: 0 }}>
      <span style={{ color: MUTED, marginRight: 6 }}>{BODY[k]}</span>
      {quiet ? <span style={{ color: FAINT }}>{c.s === "pending" ? c.note || "Awaiting opinion" : c.note || "No public filing"}</span>
        : <><StatusText def={statusOf(c)} />{c.date && <span style={{ color: TEXT, marginLeft: 6, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c.expected ? "by " : ""}{fmtDate(c.date)}</span>}</>}
      {full && !quiet && c.note && <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 1 }}>{c.note}</span>}
      {full && c.auto && <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 1 }}>Updated automatically by {c.auto}.</span>}
      {full && c.src && <span style={{ display: "block", marginTop: 1 }}><SourceLink href={c.src} /></span>}
    </div>
  );
}

const panelStyle = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: "12px 14px", marginBottom: 14 };
const Intro = ({ title, children }) => (
  <div style={{ fontSize: 13, color: TEXT, marginBottom: 10, lineHeight: 1.5 }}><strong style={{ color: INK, fontWeight: 600 }}>{title}</strong>{children ? <>: {children}</> : null}</div>
);
const Key = ({ swatch, children, title }) => <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{swatch}{children}</span>;
const Hint = ({ children }) => <div style={{ fontSize: 12, color: FAINT, marginTop: 8 }}>{children}</div>;

// ─── DETAIL PANEL ────────────────────────────────────────────────────────────
// Everything known about one product in one market: the story in a sentence, then
// each decision with its note and source. A side panel on desktop, a bottom sheet on phones.
function Detail({ x, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  const { p, m, pr, a, r } = x;
  const o = outcomeText(x);
  const steps = [];
  if (a) steps.push(<>Authorised on <strong style={{ fontWeight: 600 }}>{fmtDate(a)}</strong> by {BODY[pr.lead.key]}.</>);
  else if (pr.level === "review") steps.push(<>Under review at {BODY[pr.lead.key]}{pr.lead.cell?.date ? <>, decision expected by <strong style={{ fontWeight: 600 }}>{fmtDate(pr.lead.cell.date)}</strong></> : null}.</>);
  else if (x.approved) steps.push(<>Authorised by {BODY[pr.lead.key]}; the date is not recorded.</>);
  else steps.push(<>Not authorised here yet ({(pr.lead.cell?.note || LEVELS[pr.level].label).toLowerCase()}).</>);
  if (r) steps.push(<>First reimbursement decision on <strong style={{ fontWeight: 600 }}>{fmtDate(r)}</strong> ({BODY[x.rKey]}), <strong style={{ fontWeight: 600 }}>{plural(x.toPay, "month")}</strong> after authorisation.</>);
  else if (x.approved) steps.push(<>{o.strong ? <strong style={{ fontWeight: 600, color: o.color }}>{o.strong}</strong> : null}{o.rest}{x.waiting !== null ? " since authorisation, with no positive reimbursement decision yet" : ""}.</>);

  return (
    <div className="lm-overlay" onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,18,15,0.25)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={`${p.name} in ${m.name}`} className="lm-sheet" onClick={(e) => e.stopPropagation()}
        style={{ width: "min(440px, 100%)", height: "100%", overflowY: "auto", background: "#fff", boxShadow: "-8px 0 30px rgba(0,0,0,0.12)", padding: "18px 20px 28px", fontFamily: FONT, outline: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: MUTED }}><Flag m={m} />{m.name}</div>
            <div style={{ fontSize: 17, fontWeight: 600, color: INK, marginTop: 6, lineHeight: 1.3 }}>{p.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: MUTED, marginTop: 3 }}><CompanyDot company={p.company} />{p.company}<span style={{ color: "#cfcac2" }}>·</span>{p.segment === "PrEP" ? "Prevention (PrEP)" : "Treatment"}</div>
            <div style={{ fontSize: 12.5, color: TEXT, marginTop: 3, lineHeight: 1.45 }}>{aboutOf(p)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", fontSize: 24, lineHeight: 1, color: MUTED, cursor: "pointer", padding: 4, margin: -4 }}>×</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "8px 10px", background: PAPER, borderRadius: 6, fontSize: 13, color: INK }}>
          <Swatch level={pr.level} size={13} /><strong style={{ fontWeight: 600 }}>{LEVELS[pr.level].label}</strong>
          <span style={{ color: MUTED, fontSize: 12 }}>{LEVELS[pr.level].hint}</span>
        </div>
        <ul style={{ margin: "12px 0 0", paddingLeft: 18, fontSize: 13, color: TEXT, lineHeight: 1.55 }}>
          {steps.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
        </ul>

        <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, margin: "16px 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Authorisation</div>
        {pr.regs.map((d) => <div key={d.key} style={{ padding: "7px 0", borderTop: `1px solid ${HAIR}` }}><Decision k={d.key} cell={d.cell} full /></div>)}
        <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, margin: "16px 0 2px", textTransform: "uppercase", letterSpacing: 0.4 }}>Reimbursement</div>
        {pr.access.length ? pr.access.map((d) => <div key={d.key} style={{ padding: "7px 0", borderTop: `1px solid ${HAIR}` }}><Decision k={d.key} cell={d.cell} full /></div>)
          : <div style={{ padding: "7px 0", borderTop: `1px solid ${HAIR}`, fontSize: 12.5, color: FAINT }}>No reimbursement body is tracked for this market.</div>}
        {m.reg.includes("ec") && <div style={{ fontSize: 12, color: FAINT, marginTop: 14, lineHeight: 1.5 }}>The European Commission authorisation covers every EU and EEA country, so the date is the same across them; launch and reimbursement then happen country by country.</div>}
      </div>
    </div>
  );
}

// ─── LAUNCH SEQUENCE (bars) ──────────────────────────────────────────────────
// One bar per row on a shared time axis: the authorisation date, the first
// reimbursement decision, and the wait between them. Rows are markets or products.
function LaunchBars({ rows, today, onPick, head }) {
  const [tip, setTip] = useState(null);
  const wrap = useRef(null);
  const dates = rows.flatMap((x) => [x.a, x.r]).filter(Boolean);
  if (!dates.length) return <div style={{ fontSize: 13, color: MUTED, padding: "14px 2px" }}>Nothing here is authorised yet, so there is no launch sequence to show. Pick another product or market.</div>;
  const y0 = Number(dates.reduce((a, b) => (a < b ? a : b)).slice(0, 4));
  const start = `${y0}-01-01`, end = `${Number(today.slice(0, 4)) + 1}-01-01`;
  const t0 = new Date(start).getTime(), span = new Date(end).getTime() - t0;
  const xp = (iso) => `${((new Date(iso).getTime() - t0) / span) * 100}%`;
  const years = []; for (let y = y0; y <= Number(today.slice(0, 4)); y++) years.push(y);
  const step = years.length > 8 ? 2 : 1;
  const show = (e, text) => {
    const r = wrap.current.getBoundingClientRect();
    setTip({ text, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };
  const marker = (iso, kind, label) => (
    <span role="img" aria-label={label}
      onPointerEnter={(e) => e.pointerType === "mouse" && show(e, label)} onPointerMove={(e) => e.pointerType === "mouse" && show(e, label)} onPointerLeave={() => setTip(null)}
      style={{ position: "absolute", left: xp(iso), top: "50%", width: 18, height: 18, transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
      <span style={kind === "a"
        ? { width: 10, height: 10, transform: "rotate(45deg)", background: "#fff", border: `2px solid ${LEVELS.reimbursed.fill}`, boxShadow: "0 0 0 2px #fff" }
        : { width: 11, height: 11, borderRadius: 6, background: LEVELS.reimbursed.fill, boxShadow: "0 0 0 2px #fff" }} />
    </span>
  );
  const bar = (left, right, style) => <span style={{ position: "absolute", left, right, top: "50%", height: 8, transform: "translateY(-50%)", borderRadius: 4, ...style }} />;

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <div className="hiv-ls-scroll">
        <div className="hiv-ls-inner" style={{ minWidth: 640 }}>
          {/* Year axis */}
          <div className="hiv-ls" style={{ height: 22 }}>
            <span style={{ fontSize: 11.5, color: MUTED }}>{head}</span>
            <div className="hiv-ls-axis" style={{ position: "relative", height: "100%" }}>
              {years.filter((y, i) => i % step === 0).map((y) => <span key={y} style={{ position: "absolute", left: xp(`${y}-01-01`), bottom: 4, fontSize: 11.5, color: MUTED, transform: "translateX(-50%)", fontVariantNumeric: "tabular-nums" }}>{y}</span>)}
              <span style={{ position: "absolute", left: xp(today), bottom: 4, fontSize: 11.5, color: INK, fontWeight: 600, transform: "translateX(-50%)", background: "#fff", padding: "0 3px" }}>Today</span>
            </div>
            <span style={{ fontSize: 11.5, color: MUTED }}>Time to reimbursement</span>
          </div>
          {rows.map((row) => {
            const { a, r, pr } = row;
            const o = outcomeText(row);
            const neg = row.negative && statusOf(row.negative.cell);
            const open = () => onPick(row);
            return (
              <div key={row.key} className="hiv-ls lm-row" role="button" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
                aria-label={`${row.title}: ${LEVELS[pr.level].label}. Open details`} style={{ minHeight: 36, borderTop: `1px solid ${HAIR}`, cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {row.icon}
                  <span style={{ minWidth: 0 }} title={row.about}>
                    <span style={{ display: "block", fontSize: 13, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</span>
                    {row.sub && <span style={{ display: "block", fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.sub}</span>}
                  </span>
                </div>
                <div style={{ position: "relative", height: 34 }}>
                  {years.map((y) => <span key={y} aria-hidden="true" style={{ position: "absolute", left: xp(`${y}-01-01`), top: 0, bottom: 0, borderLeft: `1px solid ${HAIR}` }} />)}
                  <span aria-hidden="true" style={{ position: "absolute", left: xp(today), top: 0, bottom: 0, borderLeft: "1px dashed #bdb7ad" }} />
                  {/* Wait between authorisation and reimbursement, then time on the market */}
                  {a && r && bar(xp(a), `calc(100% - ${xp(r)})`, { background: LEVELS.approved.fill })}
                  {a && (r || row.paidNoDate) && bar(xp(r || a), `calc(100% - ${xp(today)})`, { background: LEVELS.reimbursed.fill })}
                  {a && ["untracked", "unverified", "negative"].includes(row.gap) && <span style={{ position: "absolute", left: xp(a), right: `calc(100% - ${xp(today)})`, top: "50%", height: 3, transform: "translateY(-50%)", background: "#cfc8bc", borderRadius: 2 }} />}
                  {row.gap === "negative" && row.negative.cell.date && <span role="img" aria-label={`${neg.label}, ${BODY[row.negative.key]}, ${fmtDate(row.negative.cell.date)}`} style={{ position: "absolute", left: xp(row.negative.cell.date), top: "50%", transform: "translate(-50%,-50%)", fontSize: 13, fontWeight: 700, color: neg.color, lineHeight: 1, background: "#fff", padding: "0 1px" }}>{neg.glyph}</span>}
                  {a && row.waiting !== null && bar(xp(a), `calc(100% - ${xp(today)})`, { backgroundImage: WAIT_HATCH, border: `1px solid ${LEVELS.approved.fill}` })}
                  {a && marker(a, "a", `${row.title}: authorised by ${BODY[pr.lead.key]}, ${fmtDate(a)}`)}
                  {r && marker(r, "r", `${row.title}: first reimbursement decision (${shortBody(row.rKey)}), ${fmtDate(r)}`)}
                  {pr.level === "review" && <span aria-hidden="true" style={{ position: "absolute", left: xp(today), top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: 6, background: LEVELS.review.fill, boxShadow: "0 0 0 2px #fff" }} />}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {o.strong && <strong style={{ color: o.color || INK, fontWeight: 600 }}>{o.strong}</strong>}
                  {o.rest && <span style={{ color: o.strong ? MUTED : o.color || MUTED }}>{o.rest}</span>}
                  {a && <div style={{ fontSize: 11.5, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{shortDate(a)}{r ? ` → ${shortDate(r)}` : ""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", marginTop: 12, fontSize: 12, color: TEXT, alignItems: "center" }}>
        <Key swatch={<span aria-hidden="true" style={{ width: 9, height: 9, transform: "rotate(45deg)", border: `2px solid ${LEVELS.reimbursed.fill}`, background: "#fff" }} />}>Authorised</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, background: LEVELS.approved.fill }} />}>Wait until reimbursed</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 6, background: LEVELS.reimbursed.fill }} />}>First reimbursement decision</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, background: LEVELS.reimbursed.fill }} />}>Reimbursed</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, backgroundImage: WAIT_HATCH, border: `1px solid ${LEVELS.approved.fill}` }} />}>Still waiting</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 6, background: LEVELS.review.fill }} />}>Under review</Key>
        <Key swatch={<span aria-hidden="true" style={{ width: 22, height: 3, borderRadius: 2, background: "#cfc8bc" }} />}>Negative, not verified or no body tracked</Key>
      </div>
      <Hint>Select a row to see each decision, its date and its source.</Hint>
      {tip && (
        <div role="tooltip" style={{ position: "absolute", left: Math.max(0, Math.min(tip.x + 12, tip.w - 290)), top: tip.y + 12, maxWidth: 280, zIndex: 5, pointerEvents: "none", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "7px 10px", fontSize: 12.5, color: TEXT }}>{tip.text}</div>
      )}
    </div>
  );
}

// Markets first, then ordered by how far along they are and when they got there.
const RANK = { reimbursed: 0, approved: 0, review: 1, none: 2, unknown: 3 };
const byProgress = (x, y) => RANK[x.pr.level] - RANK[y.pr.level] || (x.a || "9").localeCompare(y.a || "9") || x.title.localeCompare(y.title);

// ─── MAP ─────────────────────────────────────────────────────────────────────
// One world map that can be dragged and zoomed. Base coordinates are a fixed
// Natural Earth projection in a W × H box; panning and zooming only change the
// transform of the group that holds the countries.
const clampView = (v, h) => {
  const k = Math.min(K_MAX, Math.max(1, v.k));
  const fit = (t, lo, hi, size) => {
    const a = lo * k, b = hi * k;
    if (b - a <= size) return (size - a - b) / 2;
    return Math.min(-a, Math.max(size - b, t));
  };
  return { k, x: fit(v.x, SPHERE[0][0], SPHERE[1][0], W), y: fit(v.y, SPHERE[0][1], SPHERE[1][1], h) };
};
const viewOf = (place, h) => {
  // Meridians curve in this projection, so all four corners decide the extent.
  const [[w, n], [e, so]] = place.box;
  const pts = [[w, n], [e, n], [w, so], [e, so], [(w + e) / 2, n], [(w + e) / 2, so]].map((p) => PROJ(p));
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const k = Math.min(W / Math.abs(x1 - x0), h / Math.abs(y1 - y0)) * 0.95;
  return clampView({ k, x: W / 2 - k * (x0 + x1) / 2, y: h / 2 - k * (y0 + y1) / 2 }, h);
};
const zoomAt = (v, [px, py], f, h) => {
  const k = Math.min(K_MAX, Math.max(1, v.k * f));
  return clampView({ k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) }, h);
};

function WorldMap({ rows, onPick }) {
  const [features, setFeatures] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState(null);
  const [unit, setUnit] = useState(1);
  const startPlace = PLACES.find((p) => rows.some((x) => x.m.panel === p.panel)) || PLACES[0];
  // Phones get a taller map, so Europe fills the screen width.
  const [vh] = useState(() => (window.innerWidth < 680 ? Math.round(W * 0.9) : H));
  const [view, setView] = useState(() => viewOf(startPlace, vh));
  const [placeName, setPlaceName] = useState(startPlace.name);
  const svgRef = useRef(null);
  const wrap = useRef(null);
  const ptrs = useRef(new Map());
  const press = useRef(null);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadAtlas().then((f) => alive && setFeatures(f)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [attempt]);

  // Screen pixels per map unit, so labels and outlines keep the same size on any screen and zoom.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setUnit(el.getBoundingClientRect().width / W || 1));
    ro.observe(el);
    return () => ro.disconnect();
  }, [features]);

  const toMap = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [(e.clientX - r.left) * (W / r.width), (e.clientY - r.top) * (vh / r.height)];
  };

  // The wheel zooms around the pointer. It needs a non-passive listener to stop the page scrolling.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const wheel = (e) => { e.preventDefault(); const p = toMap(e); setView((v) => zoomAt(v, p, Math.exp(-e.deltaY * 0.0018), vh)); setPlaceName(null); };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [features, vh]);

  const paths = useMemo(() => {
    if (!features) return [];
    const path = geoPath(PROJ);
    // Antarctica is left out: nothing is tracked there and it takes a third of the height.
    return features.filter((f) => f.id !== "010").map((f) => {
      const id = Number(f.id);
      // Width of the country's mainland, used to decide when its label fits.
      const b = BY_ID[id] && path.bounds({ type: "Point", coordinates: BY_ID[id].at }) && (() => {
        const geo = f.geometry.type === "MultiPolygon" ? { type: "Polygon", coordinates: [...f.geometry.coordinates].sort((p, q) => path.area({ type: "Polygon", coordinates: q }) - path.area({ type: "Polygon", coordinates: p }))[0] } : f.geometry;
        const [[a], [c]] = path.bounds(geo);
        return c - a;
      })();
      return { id, d: path(f), w: b || 0 };
    }).filter((x) => x.d);
  }, [features]);

  const byMarket = Object.fromEntries(rows.map((x) => [x.m.id, x]));
  const idOf = (e) => Number(e.target?.dataset?.id) || null;

  const onDown = (e) => {
    if (e.button && e.button !== 0) return;
    svgRef.current.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, toMap(e));
    press.current = { id: ptrs.current.size === 1 ? idOf(e) : null, moved: 0 };
    setHover(null);
  };
  const onMove = (e) => {
    if (!ptrs.current.has(e.pointerId)) {
      // Plain hover with a mouse shows the summary of the country under it.
      const id = idOf(e);
      if (e.pointerType !== "mouse" || !id || !byMarket[id]) return setHover(null);
      const r = wrap.current.getBoundingClientRect();
      return setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
    }
    const prev = ptrs.current.get(e.pointerId);
    const cur = toMap(e);
    if (ptrs.current.size === 1) {
      setView((v) => clampView({ ...v, x: v.x + cur[0] - prev[0], y: v.y + cur[1] - prev[1] }, vh));
    } else if (ptrs.current.size === 2) {
      // Pinch: zoom by the change in finger distance, around the point between them.
      const other = [...ptrs.current.entries()].find(([k]) => k !== e.pointerId)[1];
      const d0 = Math.hypot(prev[0] - other[0], prev[1] - other[1]);
      const d1 = Math.hypot(cur[0] - other[0], cur[1] - other[1]);
      if (d0 > 0) setView((v) => zoomAt(v, [(cur[0] + other[0]) / 2, (cur[1] + other[1]) / 2], d1 / d0, vh));
    }
    if (press.current) press.current.moved += Math.abs(cur[0] - prev[0]) + Math.abs(cur[1] - prev[1]);
    if (press.current?.moved > 3) setPlaceName(null);
    ptrs.current.set(e.pointerId, cur);
  };
  const onUp = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    const p = press.current;
    // A tap or click without dragging opens the country's details.
    if (e.type === "pointerup" && p && p.id && byMarket[p.id] && p.moved * unit < 6 && ptrs.current.size === 0) onPick(byMarket[p.id]);
    if (ptrs.current.size === 0) press.current = null;
  };

  const go = (place) => { setView(viewOf(place, vh)); setPlaceName(place.name); };
  const zoomBy = (f) => setView((v) => zoomAt(v, [W / 2, vh / 2], f, vh));
  const px = unit * view.k; // screen pixels per base unit at this zoom
  const hx = hover && byMarket[hover.id];
  const btn = { fontFamily: FONT, fontSize: 12.5, color: TEXT, background: "#fff", border: "1px solid #d3cec6", borderRadius: 6, padding: "5px 10px", cursor: "pointer" };

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        {PLACES.map((p) => (
          <button key={p.name} onClick={() => go(p)} aria-pressed={placeName === p.name}
            style={{ ...btn, ...(placeName === p.name ? { background: INK, color: "#fff", borderColor: INK } : {}) }}>{p.name}</button>
        ))}
        <span style={{ flex: 1 }} />
        <button onClick={() => zoomBy(1.6)} aria-label="Zoom in" style={{ ...btn, width: 32, padding: "5px 0", fontWeight: 600 }}>+</button>
        <button onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" style={{ ...btn, width: 32, padding: "5px 0", fontWeight: 600 }}>−</button>
      </div>
      <div ref={wrap} style={{ position: "relative" }}>
        {!features ? (
          <div style={{ minHeight: 260, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20, background: PAPER, borderRadius: 4, fontSize: 13, color: MUTED }}>
            {failed ? <span>The map could not be loaded. The launch sequence above still shows every market. <button onClick={() => setAttempt((a) => a + 1)} style={{ fontFamily: FONT, fontSize: 13, color: TEXT, background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer" }}>Try again</button></span>
              : "Loading map…"}
          </div>
        ) : (
          <svg ref={svgRef} viewBox={`0 0 ${W} ${vh}`} className="lm-world" role="group" aria-label="World map. Drag to move, scroll or pinch to zoom."
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={(e) => { if (!ptrs.current.has(e.pointerId)) setHover(null); }}
            style={{ display: "block", width: "100%", height: "auto", background: "#f4f7f9", borderRadius: 4, touchAction: "none", cursor: ptrs.current.size ? "grabbing" : "grab", userSelect: "none" }}>
            <defs>
              <pattern id="lm-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform={`rotate(45) scale(${1 / view.k})`}>
                <rect width="6" height="6" fill="#fff" /><rect width="2.5" height="6" fill="#d6cfc2" />
              </pattern>
            </defs>
            <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
              {paths.map(({ id, d }) => {
                const x = byMarket[id];
                if (!x) return <path key={id} d={d} fill={UNTRACKED} stroke="#fff" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />;
                return null;
              })}
              {/* Tracked countries last, so their outline sits on top of the neighbours'. */}
              {paths.filter(({ id }) => byMarket[id]).map(({ id, d }) => {
                const x = byMarket[id];
                const lv = x.pr.level;
                const on = hover?.id === id;
                return (
                  <path key={id} d={d} data-id={id} fill={lv === "unknown" ? "url(#lm-hatch)" : LEVELS[lv].fill} stroke={on ? INK : "#fff"} strokeWidth={on ? 1.8 : 0.9} strokeLinejoin="round" vectorEffect="non-scaling-stroke"
                    tabIndex={0} role="button" aria-label={`${x.m.name}: ${LEVELS[lv].label}. Open details`} style={{ cursor: "pointer", outline: "none" }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(x); } }} />
                );
              })}
              {rows.map((x) => {
                const xy = PROJ(x.m.at);
                // A label shows once the country is wide enough on screen to hold it.
                const width = paths.find((q) => q.id === x.m.id)?.w || 0;
                if (!xy || width * px < 32) return null;
                return (
                  <text key={x.m.id} x={xy[0]} y={xy[1]} textAnchor="middle" dominantBaseline="central" pointerEvents="none"
                    style={{ fontSize: 12 / px, fontWeight: 600, fontFamily: FONT, fill: LEVELS[x.pr.level].ink, letterSpacing: 0.2 / px }}>
                    {x.m.short}
                  </text>
                );
              })}
            </g>
          </svg>
        )}
        {hx && (
          <div role="tooltip" style={{ position: "absolute", left: Math.max(0, Math.min(hover.x + 14, hover.w - 330)), top: hover.y + 14, width: "max-content", maxWidth: 320, zIndex: 5, pointerEvents: "none", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "9px 11px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: INK }}><Swatch level={hx.pr.level} />{hx.m.name}<span style={{ fontWeight: 400, color: MUTED }}>{LEVELS[hx.pr.level].label}</span></div>
            <div style={{ marginTop: 5 }}><Decision k={hx.pr.lead.key} cell={hx.pr.lead.cell} /></div>
            {hx.pr.access.map((d) => <div key={d.key} style={{ marginTop: 3 }}><Decision k={d.key} cell={d.cell} /></div>)}
            <div style={{ fontSize: 11.5, color: FAINT, marginTop: 6 }}>Click for sources and notes</div>
          </div>
        )}
      </div>
      <LevelLegend extra={<Key swatch={<span aria-hidden="true" style={{ display: "inline-block", width: 11, height: 11, borderRadius: 2, background: UNTRACKED, border: "1px solid rgba(0,0,0,0.12)" }} />}><span style={{ color: MUTED }}>Not tracked</span></Key>} />
      <Hint>Drag to move around the world; scroll, pinch or use + and − to zoom. Select a coloured country for its decisions and sources.</Hint>
    </>
  );
}

function LevelLegend({ extra }) {
  return (
    <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", marginTop: 12, fontSize: 12, color: TEXT }}>
      {LEVEL_ORDER.map((lv) => <Key key={lv} title={LEVELS[lv].hint} swatch={<Swatch level={lv} />}>{LEVELS[lv].label}</Key>)}
      {extra}
    </div>
  );
}

// ─── OVERVIEW GRID ───────────────────────────────────────────────────────────
// Products down, markets across; each cell coloured by how far the product has got
// there, with the year it was authorised.
function Overview({ products, markets, today, onPick }) {
  const groups = ["Treatment", "PrEP"].map((g) => ({ g, rows: products.filter((p) => p.segment === g) })).filter((x) => x.rows.length);
  const cols = `var(--lm-prod, 210px) repeat(${markets.length}, minmax(var(--lm-cell, 54px), 1fr))`;
  return (
    <>
      <div className="lm-matrix" style={{ overflow: "auto", maxHeight: "75vh", border: `1px solid ${LINE}`, borderRadius: 6 }}>
        <div style={{ minWidth: `calc(var(--lm-prod, 210px) + ${markets.length} * var(--lm-cell, 54px))` }}>
          <div style={{ display: "grid", gridTemplateColumns: cols, position: "sticky", top: 0, zIndex: 3, background: PAPER, boxShadow: `0 1px 0 ${LINE}` }}>
            <div className="lm-sticky" style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: MUTED, background: PAPER }}>Product</div>
            {markets.map((m) => (
              <div key={m.id} title={m.name} style={{ padding: "8px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <Flag m={m} /><span style={{ fontSize: 11, fontWeight: 600, color: TEXT }}>{m.short}</span>
              </div>
            ))}
          </div>
          {groups.map(({ g, rows }) => (
            <div key={g}>
              <div className="lm-sticky" style={{ padding: "7px 12px", fontSize: 11.5, fontWeight: 600, color: MUTED, background: "#fff", borderTop: `1px solid ${LINE}`, textTransform: "uppercase", letterSpacing: 0.4, width: "max-content" }}>{g === "PrEP" ? "Prevention (PrEP)" : "Treatment"}</div>
              {rows.map((p) => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: cols, borderTop: `1px solid ${HAIR}`, alignItems: "stretch" }}>
                  <div className="lm-sticky" title={`${p.name}: ${p.company}, ${aboutOf(p)}`} style={{ padding: "8px 12px", background: "#fff", display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <CompanyDot company={p.company} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                      <span className="lm-sub" style={{ display: "block", fontSize: 11.5, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{companyOf(p)} · {p.inn}</span>
                    </span>
                  </div>
                  {markets.map((m) => {
                    const x = launchOf(p, m, today);
                    const lv = x.pr.level;
                    const l = LEVELS[lv];
                    const text = x.a ? x.a.slice(0, 4) : lv === "review" ? "Rev." : lv === "unknown" ? "?" : x.approved ? "✓" : "—";
                    return (
                      <button key={m.id} onClick={() => onPick(x)} className="lm-cell" title={`${p.name} in ${m.name}: ${l.label}${x.a ? `, authorised ${fmtDate(x.a)}` : ""}${x.r ? `, reimbursed ${fmtDate(x.r)}` : ""}`}
                        aria-label={`${p.name} in ${m.name}: ${l.label}. Open details`}
                        style={{ margin: 2, border: "none", borderRadius: 4, cursor: "pointer", fontFamily: FONT, fontSize: 11.5, fontWeight: 600, fontVariantNumeric: "tabular-nums", minHeight: 30, color: lv === "none" || lv === "unknown" ? MUTED : l.ink, ...(lv === "unknown" ? { backgroundImage: HATCH } : { background: lv === "none" ? "#efebe4" : l.fill }) }}>
                        {text}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <LevelLegend extra={<span style={{ color: MUTED }}>The number is the year it was authorised there.</span>} />
      <Hint>Select a cell to see each decision, its date and its source.</Hint>
    </>
  );
}

// ─── HEADLINE NUMBERS ────────────────────────────────────────────────────────
function Stats({ rows, unit }) {
  const total = rows.length;
  const auth = rows.filter((x) => x.approved).length;
  const paid = rows.filter((x) => x.pr.level === "reimbursed").length;
  const times = rows.filter((x) => x.toPay !== null).map((x) => x.toPay);
  const med = median(times);
  const longest = rows.filter((x) => x.waiting !== null).sort((a, b) => b.waiting - a.waiting)[0];
  const name = (x) => (unit === "markets" ? x.m.name : unit === "products" ? x.p.name : `${x.p.name} in ${x.m.name}`);
  const items = [
    { label: "Authorised", value: `${auth} of ${total}`, sub: unit },
    { label: "Reimbursed", value: `${paid} of ${total}`, sub: `${unit}, by at least one body` },
    { label: "Typical time to reimbursement", value: med === null ? "No data" : plural(med, "month"), sub: times.length ? `Median from authorisation, over ${plural(times.length, unit === "markets" ? "market" : unit === "products" ? "product" : "pair")}` : "No dated reimbursement yet" },
    { label: "Longest current wait", value: longest ? plural(longest.waiting, "month") : "None", sub: longest ? name(longest) : "Nothing authorised is waiting" },
  ];
  return (
    <div className="hiv-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", marginBottom: 14, overflow: "hidden" }}>
      {items.map((s, i) => (
        <div key={s.label} style={{ padding: "12px 16px", borderLeft: i ? `1px solid ${HAIR}` : "none" }}>
          <div style={{ fontSize: 12.5, color: MUTED }}>{s.label}</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: INK, lineHeight: 1.25, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.4 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── HOW TO READ ─────────────────────────────────────────────────────────────
function HowToRead() {
  return (
    <details className="lm-help" style={{ ...panelStyle, padding: "10px 14px" }}>
      <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600, color: INK }}>How to read this page</summary>
      <div style={{ fontSize: 12.5, color: TEXT, lineHeight: 1.6, marginTop: 8, display: "grid", gap: 6 }}>
        <div><strong style={{ fontWeight: 600 }}>By product</strong> follows one product across the {MARKETS.length} markets we track. <strong style={{ fontWeight: 600 }}>By country</strong> compares every product in one market. <strong style={{ fontWeight: 600 }}>Overview</strong> shows all products against all markets at once.</div>
        <div>Each bar starts when the product was <strong style={{ fontWeight: 600 }}>authorised</strong> (◇). The light part is the wait until the <strong style={{ fontWeight: 600 }}>first reimbursement decision</strong> (●); the dark part is the time since. A striped bar means it is authorised and still waiting. The figure on the right is the number of months between the two.</div>
        <div>{LEVEL_ORDER.map((lv, i) => <span key={lv}>{i ? " " : ""}<span style={{ display: "inline-flex", alignItems: "center", gap: 5, verticalAlign: "middle" }}><Swatch level={lv} /><strong style={{ fontWeight: 600 }}>{LEVELS[lv].label}</strong></span>: {LEVELS[lv].hint.toLowerCase()}.</span>)}</div>
        <div>Authorised means by the market's regulator (the European Commission for EU and EEA countries, Swissmedic, MHRA, FDA, Health Canada, TGA). Reimbursed means at least one body lists, funds or recommends it, possibly with restrictions; in the UK that can be NICE (England) or the SMC (Scotland) alone, and in Germany any completed G-BA assessment counts, since cover starts at launch. No reimbursement body is tracked for the US.</div>
        <div>Select any row, country or cell for the decisions behind it, with dates, notes and links to the source.</div>
      </div>
    </details>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
const VIEWS = [{ value: "product", label: "By product" }, { value: "country", label: "By country" }, { value: "overview", label: "Overview" }];
const SEGMENTS = [{ value: "All", label: "All" }, { value: "Treatment", label: "Treatment" }, { value: "PrEP", label: "PrEP" }];

export default function HivLaunchMap() {
  const feed = useHivSignals();
  const ALL = useMemo(() => applyLive(BASE, feed.live).products, [feed.live]);
  const today = todayIso();
  const [view, setView] = useState("product");
  const [segment, setSegment] = useState("All");
  const [companies, setCompanies] = useState(null);
  const [assetIds, setAssetIds] = useState(null);
  const [areas, setAreas] = useState(null);
  const [countrySel, setCountrySel] = useState(null);
  const [productId, setProductId] = useState("biktarvy");
  const [marketId, setMarketId] = useState(276);
  const [detail, setDetail] = useState(null);
  const closeDetail = useCallback(() => setDetail(null), []);

  // Product filters: segment and company narrow the list; the asset pick narrows it further.
  const inScope = ALL.filter((p) => (segment === "All" || p.segment === segment) && (!companies?.length || companies.some((c) => p.company.includes(c))));
  const pickedAssets = assetIds && assetIds.filter((id) => inScope.some((p) => p.id === id));
  const products = pickedAssets?.length ? inScope.filter((p) => pickedAssets.includes(p.id)) : inScope;
  // Market filters: region narrows the countries; the country pick narrows them further.
  const pickedAreas = areas && areas.filter((a) => AREAS.includes(a));
  const regionMarkets = pickedAreas?.length ? MARKETS.filter((m) => pickedAreas.includes(m.area)) : MARKETS;
  const pickedCountries = countrySel && countrySel.filter((id) => regionMarkets.some((m) => m.id === id));
  const markets = pickedCountries?.length ? regionMarkets.filter((m) => pickedCountries.includes(m.id)) : regionMarkets;

  const product = ALL.find((p) => p.id === productId) || ALL[0];
  const market = BY_ID[marketId] || MARKETS[0];
  const filtered = companies !== null || assetIds !== null || areas !== null || countrySel !== null || segment !== "All";
  const reset = () => { setSegment("All"); setCompanies(null); setAssetIds(null); setAreas(null); setCountrySel(null); };

  // Rows for the current view.
  let rows = [];
  if (view === "product") rows = markets.map((m) => ({ ...launchOf(product, m, today), key: m.id, title: m.name, icon: <Flag m={m} /> })).sort(byProgress);
  if (view === "country") rows = products.map((p) => ({ ...launchOf(p, market, today), key: p.id, title: p.name, sub: `${companyOf(p)} · ${p.inn}`, about: `${p.company}, ${aboutOf(p)}`, icon: <CompanyDot company={p.company} /> })).sort(byProgress);
  const allPairs = view === "overview" ? products.flatMap((p) => markets.map((m) => launchOf(p, m, today))) : rows;

  const productFilters = (
    <>
      <Segmented label="Segment" value={segment} onChange={setSegment} options={SEGMENTS} />
      <MultiSelect label="Company" allLabel="All companies" selected={companies} onChange={setCompanies} options={COMPANIES} />
      <MultiSelect label="Product" allLabel="All products" selected={pickedAssets} onChange={setAssetIds} options={inScope.map((p) => ({ value: p.id, label: `${p.name} (${p.inn})` }))} />
    </>
  );
  const marketFilters = (
    <>
      <MultiSelect label="Region" allLabel="All regions" selected={pickedAreas} onChange={setAreas} options={AREAS} />
      <MultiSelect label="Country" allLabel="All countries" selected={pickedCountries} onChange={setCountrySel} options={regionMarkets.map((m) => ({ value: m.id, label: m.name }))} />
    </>
  );

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .lm-row:hover, .lm-row:focus-visible { background: ${PAPER}; outline: none; }
        .lm-cell:hover, .lm-cell:focus-visible { outline: 2px solid ${INK}; outline-offset: -1px; opacity: 1 !important; }
        .lm-sticky { position: sticky; left: 0; z-index: 1; box-shadow: 1px 0 0 ${LINE}; }
        .hiv-ls { display: grid; grid-template-columns: 170px minmax(420px,1fr) 210px; column-gap: 14px; align-items: center; }
        .hiv-ls-scroll { overflow-x: auto; }
        .lm-world path[role=button]:focus-visible { stroke: ${INK}; stroke-width: 2px; }
        @media (max-width: 760px) {
          .hiv-ls { grid-template-columns: 112px minmax(380px,1fr) 150px; column-gap: 10px; }
        }
      `}</style>

      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: INK, margin: 0 }}>HIV launch map</h2>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.5 }}>When each HIV product was authorised and reimbursed in {MARKETS.length} markets, and how long that took.</div>
      </div>

      {/* Controls: the view first, then the filters that apply to it */}
      <div className="lm-controls" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
        <Segmented label="View" value={view} onChange={(v) => { setView(v); setDetail(null); }} options={VIEWS} />
        {view === "product" && (
          <Picker label="Product" value={product.id} onChange={setProductId}>
            {["Treatment", "PrEP"].map((g) => <optgroup key={g} label={g === "PrEP" ? "Prevention (PrEP)" : "Treatment"}>{ALL.filter((p) => p.segment === g).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.inn})</option>)}</optgroup>)}
          </Picker>
        )}
        {view === "country" && (
          <Picker label="Country" value={market.id} onChange={(v) => setMarketId(Number(v))}>
            {AREAS.map((a) => <optgroup key={a} label={a}>{MARKETS.filter((m) => m.area === a).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>)}
          </Picker>
        )}
      </div>
      <div className="lm-controls" style={{ display: "flex", gap: "10px 16px", flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        {view !== "product" && productFilters}
        {view !== "country" && marketFilters}
        {filtered && <button onClick={reset} style={{ fontFamily: FONT, fontSize: 12.5, color: TEXT, background: "none", border: "none", padding: 0, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>Clear filters</button>}
      </div>

      {view === "product" && (
        <ProductCard p={product} />
      )}

      {(view === "product" ? markets.length : view === "country" ? products.length : products.length && markets.length) ? (
        <>
          <Stats rows={allPairs} unit={view === "product" ? "markets" : view === "country" ? "products" : "product–market pairs"} />

          {view === "product" && (
            <>
              <div style={panelStyle}>
                <Intro title="Launch sequence">when {product.name} was authorised in each market and how long reimbursement took</Intro>
                <LaunchBars rows={rows} today={today} onPick={setDetail} head="Market" />
              </div>
              <div style={panelStyle}>
                <Intro title="On the map">{LEVEL_ORDER.map((lv) => ({ lv, n: rows.filter((x) => x.pr.level === lv).length })).filter((c) => c.n).map((c, i) => <span key={c.lv}>{i ? ", " : ""}{LEVELS[c.lv].label.toLowerCase()} in {c.n}</span>)}</Intro>
                <WorldMap rows={rows} onPick={setDetail} />
              </div>
            </>
          )}

          {view === "country" && (
            <div style={panelStyle}>
              <Intro title={<span style={{ display: "inline-flex", alignItems: "center", gap: 7, verticalAlign: "bottom" }}><Flag m={market} />{market.name}</span>}>
                when each product was authorised here ({market.reg.map((k) => BODY[k]).join(" or ")}) and reimbursed ({market.access.length ? market.access.map(shortBody).join(", ") : "no body tracked"})
              </Intro>
              <LaunchBars rows={rows} today={today} onPick={setDetail} head="Product" />
            </div>
          )}

          {view === "overview" && (
            <div style={panelStyle}>
              <Intro title="All products, all markets">how far each product has got in each market</Intro>
              <Overview products={products} markets={markets} today={today} onPick={setDetail} />
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center", fontSize: 13.5, color: MUTED, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, marginBottom: 14 }}>
          Nothing matches these filters. <button onClick={reset} style={{ fontFamily: FONT, fontSize: 13.5, color: TEXT, background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer" }}>Clear filters</button>
        </div>
      )}

      <HowToRead />

      <p style={{ fontSize: 12, color: FAINT, lineHeight: 1.6, margin: "4px 0 0" }}>
        Same data as the HIV CI tab: FDA, EMA and Swiss listings are checked against the official datasets each time the page loads, the other regulators' and reimbursement bodies' websites are checked automatically{AUTO.lastRun ? ` (last check ${fmtDate(AUTO.lastRun)})` : ""}, and the rest is curated by hand from each body's published decisions. "Not verified" means the listing was not confirmed, not that the product is unlisted.
      </p>

      {detail && <Detail x={detail} onClose={closeDetail} />}
    </div>
  );
}
