import { useMemo, useState } from "react";
import { AGENCIES, STATUS, PRODUCTS, EARLY_PIPELINE, VERIFIED_ON } from "./hivRegulatoryData";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const mono = "'DM Mono', monospace";
const serif = "'Georgia', serif";
const INK = "#1a1a1a";
const MUTED = "#6f6a62";
const FAINT = "#9a948a";
const LINE = "#e5e0d8";
const RED = "#c8102e";

const COMPANY_COLOR = {
  "Gilead": "#b3122b",
  "Gilead + MSD": "#7c3aed",
  "ViiV Healthcare": "#c2410c",
  "ViiV Healthcare / J&J": "#c2410c",
  "MSD": "#0f766e",
};

const AGENCY_TAG = { FDA: "FDA", CHMP: "EMA · CHMP", EC: "EC", Swissmedic: "Swissmedic", Company: "Company" };
const OUTCOME = {
  approved: STATUS.approved,
  positive: STATUS.positive,
  negative: { ...STATUS.negative, label: "Negative · CRL" },
  review: STATUS.review,
  expected: { label: "Expected", glyph: "◇", color: "#1e40af", bg: "rgba(30,64,175,0.07)", border: "rgba(30,64,175,0.25)" },
  info: { label: "Update", glyph: "·", color: MUTED, bg: "#f3f0ea", border: "#d8d2c8" },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function daysBetween(aIso, bIso) {
  return Math.round((new Date(bIso) - new Date(aIso)) / 86400000);
}
const todayIso = () => new Date().toISOString().slice(0, 10);

function Label({ children, color = FAINT, style }) {
  return <div style={{ fontSize: 9, color, fontFamily: mono, textTransform: "uppercase", letterSpacing: "1.5px", ...style }}>{children}</div>;
}

function Chip({ def, small }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: small ? "1px 7px" : "2px 8px", borderRadius: 3, fontSize: small ? 9.5 : 10.5, fontFamily: mono, fontWeight: 500, color: def.color, background: def.bg, border: `1px solid ${def.border}`, whiteSpace: "nowrap", lineHeight: 1.5 }}>
      <span aria-hidden="true" style={{ fontSize: small ? 9 : 10 }}>{def.glyph}</span>{def.label}
    </span>
  );
}

function SourceLink({ href, children = "Source" }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
      style={{ fontSize: 9.5, color: FAINT, fontFamily: mono, textDecoration: "none", borderBottom: `1px dotted ${FAINT}`, whiteSpace: "nowrap" }}>
      {children} ↗
    </a>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 12px", borderRadius: 3, fontSize: 10.5, cursor: "pointer", fontFamily: mono, fontWeight: active ? 500 : 400, border: active ? `1px solid ${INK}` : `1px solid #d1ccc4`, background: active ? INK : "#fff", color: active ? "#fff" : "#555" }}>
      {children}
    </button>
  );
}

// ─── MATRIX CELL ─────────────────────────────────────────────────────────────
function RegCell({ cell }) {
  const def = STATUS[cell?.s || "none"];
  const isEmpty = !cell || cell.s === "none" || cell.s === "pending";
  return (
    <div style={{ padding: "11px 12px", borderLeft: `1px solid #f0ede8`, minWidth: 0 }}>
      {isEmpty
        ? <div style={{ fontSize: 10.5, color: FAINT, fontFamily: mono }}>{cell?.s === "pending" ? "… Awaiting opinion" : `— ${cell?.note || "No public filing"}`}</div>
        : <>
            <Chip def={def} />
            <div style={{ marginTop: 5, fontSize: 11, color: INK, fontFamily: mono }}>
              {cell.date ? <>{cell.expected ? "by " : ""}{fmtDate(cell.date)}</> : null}
            </div>
            {cell.note && <div style={{ fontSize: 10, color: MUTED, fontFamily: mono, marginTop: 2, lineHeight: 1.4 }}>{cell.note}</div>}
            <div style={{ marginTop: 4 }}><SourceLink href={cell.src} /></div>
          </>}
    </div>
  );
}

// ─── PRODUCT ROW ─────────────────────────────────────────────────────────────
const GRID = "minmax(230px,1.5fr) repeat(4, minmax(150px,1fr))";

function ProductRow({ p, open, onToggle }) {
  const cc = COMPANY_COLOR[p.company] || INK;
  const events = [...p.events].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div style={{ borderTop: `1px solid ${LINE}` }}>
      <div role="button" tabIndex={0} aria-expanded={open} onClick={onToggle}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        style={{ display: "grid", gridTemplateColumns: GRID, cursor: "pointer", background: open ? "#fdfbf7" : "#fff" }}>
        <div style={{ padding: "11px 14px", borderLeft: `3px solid ${cc}`, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: serif }}>{p.name}</span>
            <span style={{ fontSize: 10, color: FAINT, fontFamily: mono }}>{open ? "▴" : "▾"}</span>
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, fontFamily: mono, marginTop: 2, lineHeight: 1.45 }}>{p.inn}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 500, color: cc }}>{p.company}</span>
            <span style={{ fontSize: 10, color: "#ccc" }}>·</span>
            <span style={{ fontSize: 10, fontFamily: mono, color: MUTED }}>{p.dosing}</span>
          </div>
          <div style={{ fontSize: 10, fontFamily: mono, color: FAINT, marginTop: 3 }}>{p.stage}</div>
        </div>
        {AGENCIES.map(a => <RegCell key={a.key} cell={p.reg[a.key]} />)}
      </div>

      {open && (
        <div style={{ background: "#fdfbf7", borderTop: `1px solid #f0ede8`, padding: "16px 18px 18px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.5fr)", gap: 24 }} className="hiv-detail">
          <div>
            <Label style={{ marginBottom: 6 }}>Positioning</Label>
            <p style={{ fontSize: 12.5, color: "#333", fontFamily: serif, lineHeight: 1.65, margin: 0 }}>{p.position}</p>
            <div style={{ marginTop: 12, fontSize: 11, fontFamily: mono, color: MUTED, lineHeight: 1.7 }}>
              <div><span style={{ color: FAINT }}>Class </span>{p.klass}</div>
              {p.trials && <div><span style={{ color: FAINT }}>Pivotal trials </span>{p.trials}</div>}
            </div>
            {p.watch && (
              <div style={{ marginTop: 14, padding: "10px 12px", background: "#fff", border: `1px solid ${LINE}`, borderLeft: `3px solid #92580a`, borderRadius: 3 }}>
                <Label color="#92580a" style={{ marginBottom: 4 }}>Next to watch</Label>
                <div style={{ fontSize: 12, color: "#333", fontFamily: serif, lineHeight: 1.6 }}>{p.watch}</div>
              </div>
            )}
          </div>
          <div>
            <Label style={{ marginBottom: 8 }}>Milestone history</Label>
            {events.map((e, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "86px 82px minmax(0,1fr)", gap: 10, padding: "7px 0", borderTop: i ? `1px solid #f0ede8` : "none", alignItems: "start" }}>
                <span style={{ fontSize: 11, fontFamily: mono, color: INK }}>{fmtDate(e.date)}</span>
                <span style={{ fontSize: 10, fontFamily: mono, color: MUTED }}>{AGENCY_TAG[e.agency]}</span>
                <div>
                  <div style={{ marginBottom: 3 }}><Chip def={OUTCOME[e.outcome]} small /></div>
                  <div style={{ fontSize: 12, color: "#333", fontFamily: serif, lineHeight: 1.55 }}>{e.text} <SourceLink href={e.src} /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────
function Timeline({ products }) {
  const today = todayIso();
  const all = products.flatMap(p => p.events.map(e => ({ ...e, product: p.name, company: p.company })));
  const upcoming = all.filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter(e => e.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(past.map(e => e.date.slice(0, 4)))];

  const Row = ({ e }) => (
    <div style={{ display: "grid", gridTemplateColumns: "92px 96px minmax(0,1fr)", gap: 12, padding: "10px 16px", borderTop: `1px solid #f0ede8`, alignItems: "start" }} className="hiv-tl-row">
      <span style={{ fontSize: 11.5, fontFamily: mono, color: INK }}>{fmtDate(e.date)}</span>
      <span style={{ fontSize: 10.5, fontFamily: mono, color: MUTED }}>{AGENCY_TAG[e.agency]}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: serif, color: INK }}>{e.product}</span>
          <span style={{ fontSize: 10, fontFamily: mono, color: COMPANY_COLOR[e.company] || MUTED }}>{e.company}</span>
          <Chip def={OUTCOME[e.outcome]} small />
        </div>
        <div style={{ fontSize: 12, color: "#444", fontFamily: serif, lineHeight: 1.55 }}>{e.text} <SourceLink href={e.src} /></div>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4, marginBottom: 16 }}>
        <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Label color="#1e40af">Upcoming · dated decisions</Label>
          <span style={{ fontSize: 10, fontFamily: mono, color: FAINT }}>{upcoming.length} scheduled</span>
        </div>
        {upcoming.length === 0
          ? <div style={{ padding: "12px 16px", borderTop: `1px solid #f0ede8`, fontSize: 12, fontFamily: serif, color: MUTED }}>No dated decisions on record.</div>
          : upcoming.map((e, i) => <Row key={i} e={e} />)}
      </div>
      {years.map(y => (
        <div key={y} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4, marginBottom: 12 }}>
          <div style={{ padding: "10px 16px" }}><Label color={INK}>{y}</Label></div>
          {past.filter(e => e.date.startsWith(y)).map((e, i) => <Row key={i} e={e} />)}
        </div>
      ))}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function HivRegulatoryTracker() {
  const [view, setView] = useState("matrix");
  const [segment, setSegment] = useState("All");
  const [company, setCompany] = useState("All");
  const [openId, setOpenId] = useState(null);

  const companies = ["All", "Gilead", "ViiV", "MSD"];
  const products = useMemo(() => PRODUCTS.filter(p =>
    (segment === "All" || p.segment === segment) &&
    (company === "All" || p.company.includes(company))
  ), [segment, company]);

  // Headline numbers, computed from the dataset
  const today = todayIso();
  const cells = products.flatMap(p => AGENCIES.map(a => ({ p, a, c: p.reg[a.key] })));
  const underReview = cells.filter(x => x.c?.s === "review");
  const decisions12m = products.flatMap(p => p.events.map(e => ({ ...e, product: p.name })))
    .filter(e => ["approved", "positive", "negative"].includes(e.outcome) && e.date <= today && daysBetween(e.date, today) <= 365);
  const nextDated = products.flatMap(p => p.events.map(e => ({ ...e, product: p.name })))
    .filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];

  // Per-agency scorecard
  const score = AGENCIES.map(a => {
    const col = products.map(p => p.reg[a.key]?.s || "none");
    return {
      ...a,
      favourable: col.filter(s => s === "approved" || s === "positive").length,
      review: col.filter(s => s === "review").length,
      unfavourable: col.filter(s => s === "negative" || s === "notapproved").length,
    };
  });

  const groups = ["Treatment", "PrEP"].filter(g => segment === "All" || segment === g);
  const early = EARLY_PIPELINE.filter(e => company === "All" || e.company.includes(company));

  return (
    <div>
      <style>{`
        @media (max-width: 760px) {
          .hiv-detail { grid-template-columns: 1fr !important; }
          .hiv-tl-row { grid-template-columns: 84px minmax(0,1fr) !important; }
          .hiv-tl-row > span:nth-child(2) { display: none; }
        }
      `}</style>

      {/* Headline numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 14 }}>
        {[
          { l: "Assets tracked", v: products.length, sub: `${products.filter(p => p.segment === "Treatment").length} treatment · ${products.filter(p => p.segment === "PrEP").length} PrEP` },
          { l: "Decisions · last 12 months", v: decisions12m.length, sub: decisions12m.length ? decisions12m.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2).map(e => e.product).join(", ") : "None" },
          { l: "Under review now", v: underReview.length, sub: underReview.map(x => `${x.p.name.split(" ·")[0]} (${x.a.label.replace("EMA · ", "")})`).join(", ") || "None" },
          { l: "Next dated decision", v: nextDated ? fmtDate(nextDated.date) : "—", sub: nextDated ? `${nextDated.product} · ${AGENCY_TAG[nextDated.agency]}` : "None on record", small: true },
        ].map(m => (
          <div key={m.l} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4, padding: "12px 14px" }}>
            <Label style={{ marginBottom: 6 }}>{m.l}</Label>
            <div style={{ fontSize: m.small ? 19 : 26, fontWeight: 500, color: INK, fontFamily: mono, lineHeight: 1.15 }}>{m.v}</div>
            <div style={{ fontSize: 10.5, color: MUTED, fontFamily: mono, marginTop: 5, lineHeight: 1.45 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Agency scorecard */}
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4, marginBottom: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))" }}>
        {score.map((a, i) => (
          <div key={a.key} style={{ padding: "12px 14px", borderLeft: i ? `1px solid #f0ede8` : "none" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: serif, color: INK }}>{a.label}</div>
            <div style={{ fontSize: 9.5, fontFamily: mono, color: FAINT, marginBottom: 8 }}>{a.region} · {a.hint}</div>
            <div style={{ display: "flex", gap: 14, fontFamily: mono, fontSize: 10.5 }}>
              <span style={{ color: STATUS.approved.color }}><strong style={{ fontSize: 15 }}>{a.favourable}</strong> favourable</span>
              <span style={{ color: STATUS.review.color }}><strong style={{ fontSize: 15 }}>{a.review}</strong> in review</span>
              <span style={{ color: a.unfavourable ? STATUS.negative.color : FAINT }}><strong style={{ fontSize: 15 }}>{a.unfavourable}</strong> not approved</span>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
        <div>
          <Label style={{ marginBottom: 5 }}>View</Label>
          <div style={{ display: "flex", gap: 5 }}>
            <Pill active={view === "matrix"} onClick={() => setView("matrix")}>Status by agency</Pill>
            <Pill active={view === "timeline"} onClick={() => setView("timeline")}>Timeline</Pill>
          </div>
        </div>
        <div>
          <Label style={{ marginBottom: 5 }}>Segment</Label>
          <div style={{ display: "flex", gap: 5 }}>
            {["All", "Treatment", "PrEP"].map(s => <Pill key={s} active={segment === s} onClick={() => setSegment(s)}>{s}</Pill>)}
          </div>
        </div>
        <div>
          <Label style={{ marginBottom: 5 }}>Company</Label>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {companies.map(c => <Pill key={c} active={company === c} onClick={() => setCompany(c)}>{c}</Pill>)}
          </div>
        </div>
      </div>

      {products.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", fontSize: 12, fontFamily: mono, color: MUTED, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 4 }}>No assets match these filters.</div>
      )}

      {/* Matrix */}
      {view === "matrix" && products.length > 0 && (
        <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 4, background: "#fff" }}>
          <div style={{ minWidth: 860 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, background: "#faf8f4", borderBottom: `1px solid ${INK}` }}>
              <div style={{ padding: "9px 14px" }}><Label color={INK}>Asset</Label></div>
              {AGENCIES.map(a => (
                <div key={a.key} style={{ padding: "9px 12px", borderLeft: `1px solid #f0ede8` }}>
                  <Label color={INK}>{a.label}</Label>
                  <div style={{ fontSize: 9, fontFamily: mono, color: FAINT, marginTop: 2 }}>{a.hint}</div>
                </div>
              ))}
            </div>
            {groups.map(g => {
              const rows = products.filter(p => p.segment === g);
              if (!rows.length) return null;
              return (
                <div key={g}>
                  <div style={{ padding: "7px 14px", background: "#f5f2ed", borderTop: `1px solid ${LINE}` }}>
                    <Label color={RED}>{g === "PrEP" ? "Prevention · PrEP" : "Treatment"} · {rows.length}</Label>
                  </div>
                  {rows.map(p => <ProductRow key={p.id} p={p} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />)}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "timeline" && products.length > 0 && <Timeline products={products} />}

      {/* Legend */}
      {view === "matrix" && products.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
          <Label>Key</Label>
          {["approved", "positive", "review", "negative", "notapproved", "planned"].map(k => <Chip key={k} def={STATUS[k]} small />)}
          <span style={{ fontSize: 10, fontFamily: mono, color: FAINT }}>Select a row for its full milestone history.</span>
        </div>
      )}

      {/* Earlier pipeline */}
      {early.length > 0 && segment !== "PrEP" && (
        <div style={{ marginTop: 22 }}>
          <div style={{ borderBottom: `1px solid ${LINE}`, paddingBottom: 5, marginBottom: 4 }}>
            <Label color={RED}>Earlier pipeline · no regulatory filing yet</Label>
          </div>
          {early.map(e => (
            <div key={e.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) 120px minmax(0,2fr)", gap: 12, padding: "9px 0", borderBottom: `1px solid #f0ede8`, alignItems: "baseline" }} className="hiv-tl-row">
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: serif, color: INK }}>{e.name}</div>
                <div style={{ fontSize: 10, fontFamily: mono, color: COMPANY_COLOR[e.company] || MUTED }}>{e.company}</div>
              </div>
              <span style={{ fontSize: 10.5, fontFamily: mono, color: MUTED }}>{e.stage}</span>
              <div style={{ fontSize: 12, fontFamily: serif, color: "#444", lineHeight: 1.55 }}>{e.note} <SourceLink href={e.src} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Provenance */}
      <div style={{ marginTop: 20, padding: "10px 14px", background: "#faf8f4", borderRadius: 4, border: `1px solid ${LINE}`, fontSize: 10.5, color: MUTED, fontFamily: mono, lineHeight: 1.7 }}>
        Curated from EMA EPARs and CHMP agendas, Swissmedic SwissPARs, FDA approval records and company releases. Each status links to its source.
        Last checked <strong style={{ color: INK }}>{fmtDate(VERIFIED_ON)}</strong>. This table is maintained by hand and does not update automatically; "No public filing" means no announcement was found, not that none exists.
      </div>
    </div>
  );
}
