import { useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoConicConformal, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import { AGENCIES, STATUS } from "./hivRegulatoryData";
import { ACCESS_BODIES, EXTRA_REGULATORS, ACCESS_STATUS } from "./hivAccessData";
import { FONT, INK, TEXT, MUTED, FAINT, LINE, HAIR, PAPER, COMPANY_COLOR, fmtDate, todayIso } from "./ui";

const ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json";
const ALL_STATUS = { ...STATUS, ...ACCESS_STATUS };
const BODY = Object.fromEntries([...AGENCIES, { key: "mhra", label: "MHRA" }, ...EXTRA_REGULATORS, ...ACCESS_BODIES].map((b) => [b.key, b.label]));

// One row per market we track. `id` is the ISO 3166 numeric code used by world-atlas,
// `reg` the regulator columns (first one decides; EU members fall back to the CHMP opinion),
// `access` the reimbursement bodies, `at` where the short label sits on the map.
const MARKETS = [
  { id: 840, name: "United States", short: "US", panel: "na", reg: ["fda"], access: [], at: [-99, 39] },
  { id: 124, name: "Canada", short: "CA", panel: "na", reg: ["hc"], access: ["cda"], at: [-102, 55] },
  { id: 826, name: "United Kingdom", short: "UK", panel: "eu", reg: ["mhra"], access: ["nice", "smc"], at: [-1.6, 52.6] },
  { id: 372, name: "Ireland", short: "IE", panel: "eu", reg: ["ec", "chmp"], access: ["ie"], at: [-8, 53.2] },
  { id: 250, name: "France", short: "FR", panel: "eu", reg: ["ec", "chmp"], access: ["has"], at: [2.4, 46.7] },
  { id: 276, name: "Germany", short: "DE", panel: "eu", reg: ["ec", "chmp"], access: ["gba"], at: [10.3, 51.2] },
  { id: 756, name: "Switzerland", short: "CH", panel: "eu", reg: ["ch"], access: ["sl"], at: [8.1, 46.85] },
  { id: 40, name: "Austria", short: "AT", panel: "eu", reg: ["ec", "chmp"], access: ["eko"], at: [14.6, 47.6] },
  { id: 380, name: "Italy", short: "IT", panel: "eu", reg: ["ec", "chmp"], access: ["it"], at: [12.4, 42.9] },
  { id: 724, name: "Spain", short: "ES", panel: "eu", reg: ["ec", "chmp"], access: ["es"], at: [-3.6, 40.2] },
  { id: 620, name: "Portugal", short: "PT", panel: "eu", reg: ["ec", "chmp"], access: ["pt"], at: [-8.1, 39.6] },
  { id: 528, name: "Netherlands", short: "NL", panel: "eu", reg: ["ec", "chmp"], access: ["nl"], at: [5.7, 52.3] },
  { id: 56, name: "Belgium", short: "BE", panel: "eu", reg: ["ec", "chmp"], access: ["be"], at: [4.6, 50.6] },
  { id: 208, name: "Denmark", short: "DK", panel: "eu", reg: ["ec", "chmp"], access: ["dk"], at: [9.2, 56.1] },
  { id: 752, name: "Sweden", short: "SE", panel: "eu", reg: ["ec", "chmp"], access: ["se"], at: [15.2, 62.6] },
  { id: 578, name: "Norway", short: "NO", panel: "eu", reg: ["ec", "chmp"], access: ["no"], at: [9.4, 61.3] },
  { id: 36, name: "Australia", short: "AU", panel: "au", reg: ["tga"], access: ["pbac"], at: [134, -25] },
];
const BY_ID = Object.fromEntries(MARKETS.map((m) => [m.id, m]));

// Progress steps, furthest first. Colour is a single green ramp with amber for review,
// matching the status colours used in the table; the label always travels with it.
const LEVELS = {
  reimbursed: { label: "Reimbursed", hint: "Authorised, and listed, funded or recommended by at least one body", fill: "#2d7a4b", ink: "#fff" },
  approved: { label: "Approved", hint: "Authorised, no positive reimbursement decision on record", fill: "#9fcbab", ink: INK },
  review: { label: "Under review", hint: "Filed, or a positive opinion awaiting the decision", fill: "#e9bd6b", ink: INK },
  none: { label: "Not filed", hint: "No filing found, filing planned, or not authorised", fill: "#d6cfc2", ink: TEXT },
  unknown: { label: "Not verified", hint: "Status not confirmed for this market", fill: "#d6cfc2", ink: TEXT },
};
const LEVEL_ORDER = ["reimbursed", "approved", "review", "none", "unknown"];
const UNTRACKED = "#eceae5";
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

// Each panel is fitted to a fixed box, not to the countries, so far-flung territories
// (Svalbard, French Guiana, Alaska) do not shrink the part we care about.
const box = (w, s, e, n) => ({ type: "MultiPoint", coordinates: [[w, s], [e, s], [w, n], [e, n], [(w + e) / 2, n], [(w + e) / 2, s]] });
const PANELS = {
  eu: { title: "Europe", w: 600, h: 560, proj: () => geoConicConformal().rotate([-8, 0]).parallels([40, 62]), fit: box(-11, 35.5, 26, 70.5) },
  na: { title: "North America", w: 400, h: 270, proj: () => geoConicConformal().rotate([98, 0]).parallels([33, 60]), fit: box(-128, 24, -64, 64) },
  au: { title: "Australia", w: 400, h: 270, proj: () => geoMercator(), fit: box(112, -44, 155, -10) },
};

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
  const hatch = level === "unknown" ? { backgroundImage: "repeating-linear-gradient(135deg,#d6cfc2 0 2px,#fff 2px 5px)" } : { background: l.fill };
  return <span aria-hidden="true" style={{ display: "inline-block", width: size, height: size, borderRadius: 2, border: "1px solid rgba(0,0,0,0.12)", flexShrink: 0, ...hatch }} />;
}

// One decision: body, status, date, and optionally the note and source.
function Decision({ k, cell, full }) {
  const c = cell || { s: "none" };
  const quiet = c.s === "none" || c.s === "pending";
  return (
    <div style={{ fontSize: 12.5, lineHeight: 1.45, minWidth: 0 }}>
      <span style={{ color: MUTED, marginRight: 6, whiteSpace: "nowrap" }}>{BODY[k]}</span>
      {quiet ? <span style={{ color: FAINT }}>{c.s === "pending" ? c.note || "Awaiting opinion" : c.note || "No public filing"}</span>
        : <><StatusText def={statusOf(c)} />{c.date && <span style={{ color: TEXT, marginLeft: 6, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{c.expected ? "by " : ""}{fmtDate(c.date)}</span>}</>}
      {full && !quiet && c.note && <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 1 }}>{c.note}</span>}
      {full && c.src && <span style={{ display: "block", marginTop: 1 }}><SourceLink href={c.src} /></span>}
    </div>
  );
}

function MapPanel({ id, features, progress, active, onHover, onPick }) {
  const panel = PANELS[id];
  const { paths, labels } = useMemo(() => {
    const proj = panel.proj().fitExtent([[8, 8], [panel.w - 8, panel.h - 8]], panel.fit);
    proj.clipExtent([[0, 0], [panel.w, panel.h]]);
    const path = geoPath(proj);
    const drawn = features.map((f) => ({ id: Number(f.id), d: path(f) })).filter((x) => x.d);
    const marks = MARKETS.filter((m) => m.panel === id).map((m) => ({ m, xy: proj(m.at) }));
    return { paths: drawn, labels: marks };
  }, [features, panel, id]);
  // Tracked countries are drawn last so their outline sits on top of the neighbours'.
  const mine = (cid) => (BY_ID[cid]?.panel === id ? 1 : 0);
  const order = [...paths].sort((a, b) => mine(a.id) - mine(b.id) || (a.id === active ? 1 : 0) - (b.id === active ? 1 : 0));
  return (
    <figure style={{ margin: 0, minWidth: 0, gridArea: id }}>
      <figcaption style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, marginBottom: 4 }}>{panel.title}</figcaption>
      <svg viewBox={`0 0 ${panel.w} ${panel.h}`} style={{ display: "block", width: "100%", height: "auto", background: "#f4f7f9", borderRadius: 4 }} role="group" aria-label={`${panel.title} map`}>
        <defs>
          <pattern id={`hatch-${id}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#fff" /><rect width="2.5" height="6" fill="#d6cfc2" />
          </pattern>
        </defs>
        {order.map(({ id: cid, d }) => {
          const m = BY_ID[cid];
          // Overseas bits of a tracked country (Saint Pierre and Miquelon in the North America panel) stay neutral.
          if (!m || m.panel !== id) return <path key={cid} d={d} fill={UNTRACKED} stroke="#fff" strokeWidth={0.6} />;
          const lv = progress[cid].level;
          const on = active === cid;
          return (
            <path key={cid} d={d} fill={lv === "unknown" ? `url(#hatch-${id})` : LEVELS[lv].fill} stroke={on ? INK : "#fff"} strokeWidth={on ? 1.8 : 0.9} strokeLinejoin="round"
              tabIndex={0} role="button" aria-label={`${m.name}: ${LEVELS[lv].label}`} style={{ cursor: "pointer", outline: "none" }}
              onPointerMove={(e) => e.pointerType === "mouse" && onHover(cid, e)} onPointerLeave={() => onHover(null)}
              onClick={() => onPick(cid)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(cid); } }} />
          );
        })}
        {labels.map(({ m, xy }) => xy && (
          <text key={m.id} x={xy[0]} y={xy[1]} textAnchor="middle" dominantBaseline="central" pointerEvents="none"
            className={id === "eu" ? "hiv-lbl" : "hiv-lbl hiv-lbl-inset"} style={{ fontWeight: 600, fontFamily: FONT, fill: LEVELS[progress[m.id].level].ink, letterSpacing: 0.2 }}>
            {m.short}
          </text>
        ))}
      </svg>
    </figure>
  );
}

// Everything known about one market, with notes and sources.
function MarketCard({ m, pr, onClose }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{m.name}</span>
        <button onClick={onClose} aria-label="Close market detail" style={{ border: "none", background: "none", fontSize: 18, lineHeight: 1, color: MUTED, cursor: "pointer", padding: 0 }}>×</button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: TEXT, marginTop: 3 }}><Swatch level={pr.level} />{LEVELS[pr.level].label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, margin: "10px 0 2px" }}>Authorisation</div>
      {pr.regs.map((r) => <div key={r.key} style={{ padding: "5px 0", borderTop: `1px solid ${HAIR}` }}><Decision k={r.key} cell={r.cell} full /></div>)}
      <div style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, margin: "10px 0 2px" }}>Reimbursement</div>
      {pr.access.length ? pr.access.map((a) => <div key={a.key} style={{ padding: "5px 0", borderTop: `1px solid ${HAIR}` }}><Decision k={a.key} cell={a.cell} full /></div>)
        : <div style={{ padding: "5px 0", borderTop: `1px solid ${HAIR}`, fontSize: 12.5, color: FAINT }}>No reimbursement body tracked for this market.</div>}
    </div>
  );
}

// ─── LAUNCH TIMELINE ─────────────────────────────────────────────────────────
// One bar per market on a shared time axis: the authorisation date, the first
// reimbursement decision, and the wait between them.
const FLAG = (m) => `https://flagcdn.com/w40/${m.short === "UK" ? "gb" : m.short.toLowerCase()}.png`;
const MONTH_MS = 30.44 * 86400000;
const monthsBetween = (a, b) => Math.max(0, Math.round((new Date(b) - new Date(a)) / MONTH_MS));
const shortDate = (iso) => { const [y, m] = iso.split("-").map(Number); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]} ${y}`; };

function timelineRow(p, m, pr, today) {
  const lead = pr.lead;
  const approved = pr.level === "approved" || pr.level === "reimbursed";
  const a = approved ? lead.cell?.date : null;
  const paid = pr.access.filter((x) => covers(x.key, x.cell));
  const dated = paid.filter((x) => x.cell.date).sort((x, y) => x.cell.date.localeCompare(y.cell.date));
  const first = dated[0];
  // A decision dated before the authorisation (a pre-launch listing) counts from the authorisation.
  const r = first ? (a && first.cell.date < a ? a : first.cell.date) : null;
  // Why there is no reimbursement yet: no body tracked, status not verified, a negative decision, or still waiting.
  const negative = pr.access.find((x) => ["unfavourable", "noadded"].includes(x.cell?.s) && !covers(x.key, x.cell));
  const unverified = pr.access.length > 0 && pr.access.every((x) => x.cell?.s === "none" && /not verified/i.test(x.cell?.note || ""));
  const gap = approved && !paid.length ? (!pr.access.length ? "untracked" : negative ? "negative" : unverified ? "unverified" : "waiting") : null;
  return { m, pr, a, r, rKey: first?.key, approved, paidNoDate: !first && paid.length > 0, gap, negative, waiting: gap === "waiting" && a ? monthsBetween(a, today) : null };
}

function LaunchTimeline({ p, progress, today }) {
  const [tip, setTip] = useState(null);
  const box = useRef(null);
  const rows = MARKETS.map((m) => timelineRow(p, m, progress[m.id], today));
  const rank = { reimbursed: 0, approved: 0, review: 1, none: 2, unknown: 3 };
  rows.sort((x, y) => rank[x.pr.level] - rank[y.pr.level] || (x.a || "9").localeCompare(y.a || "9") || x.m.name.localeCompare(y.m.name));
  const dates = rows.flatMap((x) => [x.a, x.r]).filter(Boolean);
  if (!dates.length) {
    return <div style={{ fontSize: 13, color: MUTED, padding: "14px 2px" }}>{p.name} is not authorised in any tracked market yet, so there is no launch sequence to show.</div>;
  }
  const y0 = Number(dates.reduce((a, b) => (a < b ? a : b)).slice(0, 4));
  const start = `${y0}-01-01`, end = `${Number(today.slice(0, 4)) + 1}-01-01`;
  const t0 = new Date(start).getTime(), span = new Date(end).getTime() - t0;
  const x = (iso) => `${((new Date(iso).getTime() - t0) / span) * 100}%`;
  const years = []; for (let y = y0; y <= Number(today.slice(0, 4)); y++) years.push(y);
  const step = years.length > 8 ? 2 : 1;
  const show = (e, text) => {
    const r = box.current.getBoundingClientRect();
    setTip({ text, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };
  const marker = (iso, kind, label) => (
    <span role="img" aria-label={label} tabIndex={0}
      onPointerEnter={(e) => show(e, label)} onPointerMove={(e) => show(e, label)} onPointerLeave={() => setTip(null)} onFocus={(e) => { const b = e.target.getBoundingClientRect(); show({ clientX: b.right, clientY: b.bottom }, label); }} onBlur={() => setTip(null)}
      style={{ position: "absolute", left: x(iso), top: "50%", width: 18, height: 18, transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "default", outline: "none", zIndex: 2 }}>
      <span style={kind === "a"
        ? { width: 10, height: 10, transform: "rotate(45deg)", background: "#fff", border: `2px solid ${LEVELS.reimbursed.fill}`, boxShadow: "0 0 0 2px #fff" }
        : { width: 11, height: 11, borderRadius: 6, background: LEVELS.reimbursed.fill, boxShadow: "0 0 0 2px #fff" }} />
    </span>
  );

  return (
    <div ref={box} style={{ position: "relative" }}>
      <style>{`
        .hiv-ls { display: grid; grid-template-columns: 150px minmax(420px,1fr) 210px; column-gap: 14px; align-items: center; }
        .hiv-ls-scroll { overflow-x: auto; }
        @media (max-width: 760px) { .hiv-ls { grid-template-columns: 112px minmax(380px,1fr) 150px; column-gap: 10px; } }
      `}</style>
      <div className="hiv-ls-scroll">
        <div className="hiv-ls-inner" style={{ minWidth: 640 }}>
          {/* Year axis */}
          <div className="hiv-ls" style={{ height: 22 }}>
            <span />
            <div className="hiv-ls-axis" style={{ position: "relative", height: "100%" }}>
              {years.filter((y, i) => i % step === 0).map((y) => <span key={y} style={{ position: "absolute", left: x(`${y}-01-01`), bottom: 4, fontSize: 11.5, color: MUTED, transform: "translateX(-50%)", fontVariantNumeric: "tabular-nums" }}>{y}</span>)}
              <span style={{ position: "absolute", left: x(today), bottom: 4, fontSize: 11.5, color: INK, fontWeight: 600, transform: "translateX(-50%)", background: "#fff", padding: "0 3px" }}>Today</span>
            </div>
            <span style={{ fontSize: 11.5, color: MUTED }}>Time to reimbursement</span>
          </div>
          {rows.map((row) => {
            const { m, pr, a, r } = row;
            const regName = BODY[pr.lead.key];
            const firstBody = row.rKey && BODY[row.rKey].split(" · ")[0];
            const neg = row.negative && statusOf(row.negative.cell);
            let side;
            if (r) side = <><strong style={{ color: INK, fontWeight: 600 }}>{monthsBetween(a, r)} months</strong> <span style={{ color: MUTED }}>to {firstBody}</span></>;
            else if (row.paidNoDate) side = <span style={{ color: MUTED }}>{a ? "Reimbursed, date not recorded" : "Authorised and reimbursed, dates not recorded"}</span>;
            else if (row.gap === "untracked") side = <span style={{ color: MUTED }}>No reimbursement body tracked</span>;
            else if (row.gap === "unverified") side = <span style={{ color: MUTED }}>Reimbursement not verified</span>;
            else if (row.gap === "negative") side = <><strong style={{ color: neg.color, fontWeight: 600 }}>{neg.label}</strong> <span style={{ color: MUTED }}>({BODY[row.negative.key].split(" · ")[0]})</span></>;
            else if (row.waiting !== null) side = <><strong style={{ color: "#92580a", fontWeight: 600 }}>Waiting {row.waiting} months</strong></>;
            else if (row.approved) side = <span style={{ color: MUTED }}>Authorised, date not recorded</span>;
            else side = <span style={{ color: pr.level === "review" ? "#92580a" : FAINT }}>{LEVELS[pr.level].label}</span>;
            return (
              <div key={m.id} className="hiv-ls" style={{ minHeight: 34, borderTop: `1px solid ${HAIR}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <img src={FLAG(m)} alt="" width={20} height={15} loading="lazy" style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)", objectFit: "cover", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>
                </div>
                <div style={{ position: "relative", height: 34 }}>
                  {years.map((y) => <span key={y} aria-hidden="true" style={{ position: "absolute", left: x(`${y}-01-01`), top: 0, bottom: 0, borderLeft: `1px solid ${HAIR}` }} />)}
                  <span aria-hidden="true" style={{ position: "absolute", left: x(today), top: 0, bottom: 0, borderLeft: `1px dashed #bdb7ad` }} />
                  {/* Wait between authorisation and reimbursement, then time on the market */}
                  {a && r && <span style={{ position: "absolute", left: x(a), width: `calc(${x(r)} - ${x(a)})`, top: "50%", height: 8, transform: "translateY(-50%)", background: LEVELS.approved.fill, borderRadius: 4 }} />}
                  {a && (r || row.paidNoDate) && <span style={{ position: "absolute", left: x(r || a), right: `calc(100% - ${x(today)})`, top: "50%", height: 8, transform: "translateY(-50%)", background: LEVELS.reimbursed.fill, borderRadius: 4, opacity: row.paidNoDate ? 0.55 : 1 }} />}
                  {a && (row.gap === "untracked" || row.gap === "unverified" || row.gap === "negative") && <span style={{ position: "absolute", left: x(a), right: `calc(100% - ${x(today)})`, top: "50%", height: 3, transform: "translateY(-50%)", background: "#cfc8bc", borderRadius: 2 }} />}
                  {row.gap === "negative" && row.negative.cell.date && <span role="img" aria-label={`${neg.label}, ${BODY[row.negative.key]}, ${fmtDate(row.negative.cell.date)}`} title={`${neg.label}, ${BODY[row.negative.key]}, ${fmtDate(row.negative.cell.date)}`} style={{ position: "absolute", left: x(row.negative.cell.date), top: "50%", transform: "translate(-50%,-50%)", fontSize: 13, fontWeight: 700, color: neg.color, lineHeight: 1, background: "#fff", padding: "0 1px" }}>{neg.glyph}</span>}
                  {a && row.waiting !== null && <span style={{ position: "absolute", left: x(a), right: `calc(100% - ${x(today)})`, top: "50%", height: 8, transform: "translateY(-50%)", backgroundImage: `repeating-linear-gradient(135deg, ${LEVELS.approved.fill} 0 4px, #fff 4px 7px)`, borderRadius: 4, border: `1px solid ${LEVELS.approved.fill}` }} />}
                  {a && marker(a, "a", `${m.name}: approved by ${regName}, ${fmtDate(a)}`)}
                  {r && marker(r, "r", `${m.name}: reimbursed after ${firstBody}, ${fmtDate(r)}`)}
                  {pr.level === "review" && <span style={{ position: "absolute", left: x(today), top: "50%", transform: "translate(-50%,-50%)", width: 10, height: 10, borderRadius: 6, background: LEVELS.review.fill, boxShadow: "0 0 0 2px #fff" }} title={`Under review at ${regName}`} />}
                </div>
                <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
                  {side}
                  {a && <div style={{ fontSize: 11.5, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{shortDate(a)}{r ? ` → ${shortDate(r)}` : ""}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", marginTop: 10, fontSize: 12, color: TEXT, alignItems: "center" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 9, height: 9, transform: "rotate(45deg)", border: `2px solid ${LEVELS.reimbursed.fill}`, background: "#fff" }} />Authorised</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, background: LEVELS.approved.fill }} />Waiting for reimbursement</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 6, background: LEVELS.reimbursed.fill }} />First reimbursement decision</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, background: LEVELS.reimbursed.fill }} />Reimbursed</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 22, height: 7, borderRadius: 4, backgroundImage: `repeating-linear-gradient(135deg, ${LEVELS.approved.fill} 0 4px, #fff 4px 7px)`, border: `1px solid ${LEVELS.approved.fill}` }} />Still waiting</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span aria-hidden="true" style={{ width: 22, height: 3, borderRadius: 2, background: "#cfc8bc" }} />Negative decision, not verified or not tracked</span>
      </div>
      {tip && (
        <div role="tooltip" style={{ position: "absolute", left: Math.max(0, Math.min(tip.x + 12, tip.w - 290)), top: tip.y + 12, maxWidth: 280, zIndex: 5, pointerEvents: "none", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "7px 10px", fontSize: 12.5, color: TEXT }}>{tip.text}</div>
      )}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function HivProgressMap({ products, onOpen }) {
  const [pickedId, setPickedId] = useState(null);
  const [features, setFeatures] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const wrap = useRef(null);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    loadAtlas().then((f) => alive && setFeatures(f)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [attempt]);

  const p = products.find((x) => x.id === pickedId) || products[0];
  const progress = useMemo(() => Object.fromEntries(MARKETS.map((m) => [m.id, progressOf(p, m)])), [p]);
  const counts = LEVEL_ORDER.map((lv) => ({ lv, n: MARKETS.filter((m) => progress[m.id].level === lv).length })).filter((x) => x.n);

  const onHover = (id, e) => {
    if (!id || !wrap.current) return setHover(null);
    const r = wrap.current.getBoundingClientRect();
    setHover({ id, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
  };
  const onPick = (id) => { setSelected(id); setHover(null); };
  const hm = hover && BY_ID[hover.id];
  const sel = selected && BY_ID[selected];

  return (
    <div>
      <style>{`
        /* Europe is the main panel; the two insets and the market card sit beside it, or below it on phones. */
        .hiv-map { display: grid; gap: 12px; align-items: start; grid-template-columns: minmax(0,1.5fr) minmax(0,1fr) minmax(0,1fr); grid-template-areas: "eu na card" "eu au card"; }
        @media (max-width: 1100px) {
          .hiv-map { grid-template-columns: minmax(0,1.5fr) minmax(0,1fr); grid-template-areas: "eu na" "eu au" "eu card"; }
        }
        .hiv-prog { display: grid; grid-template-columns: 150px minmax(0,1fr) minmax(0,1.4fr); gap: 14px; }
        .hiv-lbl { font-size: 12.5px; }
        .hiv-lbl-inset { font-size: 14px; }
        .hiv-map path[role=button]:focus-visible { stroke: ${INK}; stroke-width: 1.8px; }
        .hiv-prog-row:hover { background: ${PAPER}; }
        @media (max-width: 760px) {
          .hiv-map { grid-template-columns: minmax(0,1fr) minmax(0,1fr); grid-template-areas: "eu eu" "na au" "card card"; }
          .hiv-lbl { font-size: 17px; }
          .hiv-lbl-inset { font-size: 24px; }
          .hiv-prog { grid-template-columns: minmax(0,1fr); gap: 4px; }
          .hiv-prog-head { display: none !important; }
        }
      `}</style>

      {/* Product picker and the one-line summary */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: MUTED, maxWidth: "100%" }}>
          Product
          <select value={p.id} onChange={(e) => { setPickedId(e.target.value); setSelected(null); }}
            style={{ fontFamily: FONT, fontSize: 13, color: INK, fontWeight: 600, padding: "6px 8px", border: "1px solid #d3cec6", borderRadius: 6, background: "#fff", maxWidth: "min(320px, 70vw)" }}>
            {["Treatment", "PrEP"].map((g) => {
              const rows = products.filter((x) => x.segment === g);
              return rows.length ? <optgroup key={g} label={g === "PrEP" ? "Prevention (PrEP)" : "Treatment"}>{rows.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup> : null;
            })}
          </select>
        </label>
        <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12.5, color: MUTED }}>
          <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: COMPANY_COLOR[p.company] || "#bbb", marginRight: 7 }} />
          {p.company}<span style={{ color: "#cfcac2", margin: "0 6px" }}>·</span>{p.stage}
        </span>
        <button onClick={() => onOpen(p.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: TEXT, background: "none", border: "none", padding: 0, textDecoration: "underline", textUnderlineOffset: 2, cursor: "pointer" }}>Full history and sources</button>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: TEXT, marginBottom: 8, lineHeight: 1.5 }}>
          <strong style={{ color: INK, fontWeight: 600 }}>Launch sequence</strong>: when {p.name} was authorised in each market and how long reimbursement took.
        </div>
        <LaunchTimeline p={p} progress={progress} today={todayIso()} />
      </div>

      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, padding: 12 }}>
        <div style={{ fontSize: 13, color: TEXT, marginBottom: 10, lineHeight: 1.5 }}>
          <strong style={{ color: INK, fontWeight: 600 }}>{p.name}</strong> across {MARKETS.length} markets: {counts.map((c, i) => <span key={c.lv}>{i ? ", " : ""}{LEVELS[c.lv].label.toLowerCase()} in {c.n}</span>)}.
        </div>

        <div ref={wrap} className="hiv-map" style={{ position: "relative" }}>
          {!features ? (
            <div style={{ gridColumn: "1 / -1", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 20, background: PAPER, borderRadius: 4, fontSize: 13, color: MUTED }}>
              {failed ? <span>The map could not be loaded. The progress list below still shows every market. <button onClick={() => setAttempt((a) => a + 1)} style={{ fontFamily: FONT, fontSize: 13, color: TEXT, background: "none", border: "none", padding: 0, textDecoration: "underline", cursor: "pointer" }}>Try again</button></span>
                : "Loading map…"}
            </div>
          ) : (
            <>
              <MapPanel id="eu" features={features} progress={progress} active={selected} onHover={onHover} onPick={onPick} />
              <MapPanel id="na" features={features} progress={progress} active={selected} onHover={onHover} onPick={onPick} />
              <MapPanel id="au" features={features} progress={progress} active={selected} onHover={onHover} onPick={onPick} />
              <div style={{ gridArea: "card", minWidth: 0 }}>
                {sel ? <MarketCard m={sel} pr={progress[sel.id]} onClose={() => setSelected(null)} />
                  : <div style={{ fontSize: 12.5, color: FAINT, padding: "4px 2px" }}>Select a country for each decision, its date and source.</div>}
              </div>
            </>
          )}

          {/* Hover summary; the full detail opens on click */}
          {hm && (
            <div role="tooltip" style={{ position: "absolute", left: Math.max(0, Math.min(hover.x + 14, hover.w - 330)), top: hover.y + 14, width: "max-content", maxWidth: 320, zIndex: 5, pointerEvents: "none", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: "9px 11px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: INK }}><Swatch level={progress[hm.id].level} />{hm.name}<span style={{ fontWeight: 400, color: MUTED }}>{LEVELS[progress[hm.id].level].label}</span></div>
              <div style={{ marginTop: 5 }}><Decision k={progress[hm.id].lead.key} cell={progress[hm.id].lead.cell} /></div>
              {progress[hm.id].access.map((a) => <div key={a.key} style={{ marginTop: 3 }}><Decision k={a.key} cell={a.cell} /></div>)}
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "8px 18px", flexWrap: "wrap", marginTop: 12, fontSize: 12, color: TEXT }}>
          {LEVEL_ORDER.map((lv) => <span key={lv} title={LEVELS[lv].hint} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Swatch level={lv} />{LEVELS[lv].label}</span>)}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: MUTED }}><span aria-hidden="true" style={{ display: "inline-block", width: 11, height: 11, borderRadius: 2, background: UNTRACKED, border: "1px solid rgba(0,0,0,0.12)" }} />Not tracked</span>
        </div>
        <div style={{ fontSize: 12, color: FAINT, marginTop: 6, lineHeight: 1.5 }}>
          Approved means authorised by the market's regulator (the European Commission for EU and EEA countries). Reimbursed means at least one body lists, funds or recommends it, possibly with restrictions; in the UK that can be NICE (England) or the SMC (Scotland) alone, and in Germany any completed G-BA assessment counts, since cover starts at launch. No reimbursement body is tracked for the US.
        </div>
      </div>

      {/* Progress grid: readable without the map */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, marginTop: 14, overflow: "hidden" }}>
        <div className="hiv-prog hiv-prog-head" style={{ padding: "10px 16px", background: PAPER, fontSize: 12, fontWeight: 600, color: MUTED }}>
          <span>Market</span><span>Authorisation</span><span>Reimbursement</span>
        </div>
        {MARKETS.map((m) => {
          const pr = progress[m.id];
          const open = selected === m.id;
          return (
            <div key={m.id} className="hiv-prog hiv-prog-row" onClick={() => setSelected(open ? null : m.id)} aria-expanded={open}
              style={{ padding: "9px 16px", borderTop: `1px solid ${HAIR}`, alignItems: "baseline", cursor: "pointer", background: open ? PAPER : undefined }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{m.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MUTED, marginTop: 2 }}><Swatch level={pr.level} size={10} />{LEVELS[pr.level].label}</div>
              </div>
              <Decision k={pr.lead.key} cell={pr.lead.cell} full={open} />
              <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                {pr.access.length ? pr.access.map((a) => <Decision key={a.key} k={a.key} cell={a.cell} full={open} />) : <span style={{ fontSize: 12.5, color: FAINT }}>Not tracked</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
