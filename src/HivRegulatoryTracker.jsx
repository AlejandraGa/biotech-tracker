import { useEffect, useMemo, useState } from "react";
import { AGENCIES, STATUS, PRODUCTS, EARLY_PIPELINE, VERIFIED_ON } from "./hivRegulatoryData";
import { ACCESS_BODIES, ACCESS, ACCESS_STATUS, ACCESS_VERIFIED_ON } from "./hivAccessData";
import { applyLive } from "./liveStatus";
import { FONT, INK, TEXT, MUTED, FAINT, LINE, HAIR, PAPER, COMPANY_COLOR, fmtDate, todayIso } from "./ui";

const AGENCY_TAG = { FDA: "FDA", CHMP: "EMA · CHMP", EC: "European Commission", Swissmedic: "Swissmedic", MHRA: "MHRA", NICE: "NICE", "G-BA": "G-BA", HAS: "HAS", BAG: "BAG", Dachverband: "Dachverband (Austria)", Company: "Company update" };
const ALL_STATUS = { ...STATUS, ...ACCESS_STATUS };
const REG_COLS = [...AGENCIES, { key: "mhra", label: "MHRA", region: "United Kingdom", hint: "Marketing authorisation" }];
const statusOf = (cell) => (cell?.label ? { ...ALL_STATUS[cell.s], label: cell.label } : ALL_STATUS[cell?.s || "none"]);
const gridFor = (n) => `minmax(250px,1.3fr) repeat(${n}, minmax(168px,1fr))`;

// Curated regulatory data joined with the market-access data for each asset.
const BASE = PRODUCTS.map((p) => {
  const a = ACCESS[p.id];
  if (!a) return { ...p, access: {} };
  const { mhra, events, watch, ...access } = a;
  return { ...p, reg: { ...p.reg, mhra }, access, events: [...p.events, ...events], watch: watch || p.watch };
});
const OUTCOME = {
  approved: STATUS.approved,
  positive: STATUS.positive,
  negative: { ...STATUS.negative, label: "Complete response letter" },
  review: STATUS.review,
  expected: { label: "Expected", glyph: "◇", color: "#1e40af" },
  favourable: ACCESS_STATUS.favourable,
  restricted: { ...ACCESS_STATUS.restricted, label: "Favourable, restricted" },
  limited: ACCESS_STATUS.limited,
  listed: ACCESS_STATUS.listed,
  noadded: ACCESS_STATUS.noadded,
  unfavourable: ACCESS_STATUS.unfavourable,
  info: { label: "", glyph: "", color: MUTED },
};

const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

// ─── SMALL PIECES ────────────────────────────────────────────────────────────
function Dot({ company }) {
  return <span aria-hidden="true" style={{ display: "inline-block", width: 7, height: 7, borderRadius: 4, background: COMPANY_COLOR[company] || "#bbb", marginRight: 7, flexShrink: 0 }} />;
}

function StatusText({ def, size = 13 }) {
  if (!def.label) return null;
  return <span style={{ color: def.color, fontSize: size, fontWeight: 600, whiteSpace: "nowrap" }}><span aria-hidden="true" style={{ marginRight: 5 }}>{def.glyph}</span>{def.label}</span>;
}

function SourceLink({ href, children = "Source" }) {
  if (!href) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: MUTED, textDecoration: "underline", textUnderlineOffset: 2, whiteSpace: "nowrap" }}>{children}</a>;
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: "inline-flex", border: `1px solid #d3cec6`, borderRadius: 6, overflow: "hidden", background: "#fff" }}>
      {options.map((o, i) => (
        <button key={o} onClick={() => onChange(o)} aria-pressed={value === o}
          style={{ padding: "6px 13px", fontSize: 12.5, fontFamily: FONT, cursor: "pointer", border: "none", borderLeft: i ? `1px solid #d3cec6` : "none", background: value === o ? INK : "#fff", color: value === o ? "#fff" : TEXT, fontWeight: value === o ? 500 : 400 }}>
          {o}
        </button>
      ))}
    </div>
  );
}

// ─── MATRIX ──────────────────────────────────────────────────────────────────

function RegCell({ cell }) {
  const s = cell?.s || "none";
  const def = statusOf(cell);
  if (s === "none" || s === "pending") {
    return <div style={cellStyle}><span style={{ fontSize: 12.5, color: FAINT }}>{s === "pending" ? cell?.note || "Awaiting opinion" : cell?.note || "No public filing"}</span></div>;
  }
  return (
    <div style={cellStyle}>
      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
        <StatusText def={def} />
        {cell.date && <span style={{ fontSize: 12.5, color: TEXT, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{cell.expected ? "by " : ""}{fmtDate(cell.date)}</span>}
      </div>
      {cell.note && <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.4 }}>{cell.note}</div>}
      {cell.auto && <div style={{ fontSize: 11.5, color: "#1e40af", marginTop: 2 }}>Updated automatically</div>}
    </div>
  );
}
const cellStyle = { padding: "11px 14px", borderLeft: `1px solid ${HAIR}`, minWidth: 0 };

function ProductRow({ p, active, onOpen, cols, pick }) {
  const showInn = p.inn && p.inn.toLowerCase().replace(/\s/g, "") !== p.name.toLowerCase().replace(/\s/g, "");
  return (
    <div role="button" tabIndex={0} onClick={onOpen} className="hiv-row"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
      style={{ display: "grid", gridTemplateColumns: gridFor(cols.length), borderTop: `1px solid ${LINE}`, cursor: "pointer", background: active ? PAPER : "#fff" }}>
      <div className="hiv-sticky" style={{ padding: "11px 16px", minWidth: 0, background: "inherit" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{p.name}</span>
          <span style={{ fontSize: 11.5, color: FAINT }}>{p.stage}</span>
        </div>
        {showInn && <div style={{ fontSize: 12.5, color: TEXT, marginTop: 1, lineHeight: 1.4 }}>{p.inn}</div>}
        <div style={{ fontSize: 12, color: MUTED, marginTop: 3, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <Dot company={p.company} />{p.company}<span style={{ color: "#cfcac2", margin: "0 6px" }}>·</span>{p.dosing.replace(" · ", ", ")}
        </div>
      </div>
      {cols.map((a) => <RegCell key={a.key} cell={pick(p, a.key)} />)}
    </div>
  );
}

function StatusSection({ title, cols, pick }) {
  return (
    <>
      <h3 style={{ fontSize: 13, fontWeight: 600, color: INK, margin: "22px 0 6px" }}>{title}</h3>
          {cols.map((a) => {
            const c = pick(a.key) || { s: "none" };
            const quiet = c.s === "none" || c.s === "pending";
            return (
              <div key={a.key} style={{ display: "grid", gridTemplateColumns: "150px minmax(0,1fr)", gap: 10, padding: "8px 0", borderTop: `1px solid ${HAIR}`, fontSize: 13, alignItems: "baseline" }}>
                <span style={{ color: MUTED }}>{a.label}</span>
                <span>
                  {quiet ? <span style={{ color: FAINT }}>{c.s === "pending" ? c.note || "Awaiting opinion" : c.note || "No public filing"}</span>
                    : <><StatusText def={statusOf(c)} />{c.date && <span style={{ color: TEXT, marginLeft: 8, fontVariantNumeric: "tabular-nums" }}>{c.expected ? "by " : ""}{fmtDate(c.date)}</span>}</>}
                  {!quiet && c.note && <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2 }}>{c.note}</span>}
                  {c.auto && <span style={{ display: "block", fontSize: 12, color: "#1e40af", marginTop: 2, lineHeight: 1.45 }}>Updated automatically from {c.auto}.{c.was ? ` The curated entry said: ${ALL_STATUS[c.was.s].label.toLowerCase()}${c.was.date ? `, ${fmtDate(c.was.date)}` : ""}.` : ""}</span>}
                  {c.confirmedBy && <span style={{ display: "block", fontSize: 12, color: MUTED, marginTop: 2 }}>Confirmed against {c.confirmedBy}.</span>}
                  {c.src && <span style={{ display: "block", marginTop: 2 }}><SourceLink href={c.src} /></span>}
                </span>
              </div>
            );
          })}
    </>
  );
}

// ─── DETAIL DRAWER ───────────────────────────────────────────────────────────
function Drawer({ p, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const events = [...p.events].sort((a, b) => b.date.localeCompare(a.date));
  const field = (label, value) => value ? (
    <div style={{ display: "grid", gridTemplateColumns: "110px minmax(0,1fr)", gap: 10, padding: "6px 0", fontSize: 13 }}>
      <span style={{ color: MUTED }}>{label}</span><span style={{ color: TEXT, lineHeight: 1.5 }}>{value}</span>
    </div>
  ) : null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 700, display: "flex", justifyContent: "flex-end", background: "rgba(20,18,15,0.28)" }} onClick={onClose}>
      <aside role="dialog" aria-label={`${p.name} regulatory detail`} onClick={(e) => e.stopPropagation()}
        style={{ width: "min(500px,100%)", height: "100%", background: "#fff", overflowY: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,0.12)", fontFamily: FONT }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${LINE}`, position: "sticky", top: 0, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, color: INK, lineHeight: 1.25 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{p.inn}</div>
            </div>
            <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "none", fontSize: 24, lineHeight: 1, color: MUTED, cursor: "pointer", padding: 2 }}>×</button>
          </div>
          <div style={{ fontSize: 13, color: TEXT, marginTop: 10, display: "flex", alignItems: "center" }}><Dot company={p.company} />{p.company}<span style={{ color: "#cfcac2", margin: "0 7px" }}>·</span>{p.stage}</div>
        </div>

        <div style={{ padding: "18px 24px 28px" }}>
          <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, margin: "0 0 14px" }}>{p.position}</p>
          {field("Class", p.klass)}
          {field("Dosing", p.dosing.replace(" · ", ", "))}
          {field("Pivotal trials", p.trials)}

          {p.watch && (
            <div style={{ margin: "16px 0 4px", padding: "12px 14px", background: "#fdfaf3", border: "1px solid #eadfc8", borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#92580a", marginBottom: 3 }}>Next to watch</div>
              <div style={{ fontSize: 13.5, color: TEXT, lineHeight: 1.55 }}>{p.watch}</div>
            </div>
          )}

          <StatusSection title="Regulatory status" cols={REG_COLS} pick={(k) => p.reg[k]} />
          <StatusSection title="Reimbursement and HTA" cols={ACCESS_BODIES} pick={(k) => p.access?.[k]} />

          <h3 style={{ fontSize: 13, fontWeight: 600, color: INK, margin: "22px 0 6px" }}>Milestone history</h3>
          {events.map((e, i) => (
            <div key={i} style={{ padding: "10px 0", borderTop: `1px solid ${HAIR}` }}>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap", fontSize: 12.5 }}>
                <span style={{ color: INK, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtDate(e.date)}</span>
                <span style={{ color: MUTED }}>{AGENCY_TAG[e.agency]}</span>
                <StatusText def={OUTCOME[e.outcome]} size={12.5} />
              </div>
              <div style={{ fontSize: 13.5, color: TEXT, lineHeight: 1.55, marginTop: 3 }}>{e.text} <SourceLink href={e.src} /></div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

// ─── TIMELINE ────────────────────────────────────────────────────────────────
function Timeline({ products }) {
  const today = todayIso();
  const all = products.flatMap((p) => p.events.map((e) => ({ ...e, product: p.name, company: p.company })));
  const upcoming = all.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date));
  const past = all.filter((e) => e.date <= today).sort((a, b) => b.date.localeCompare(a.date));
  const years = [...new Set(past.map((e) => e.date.slice(0, 4)))];

  const Row = ({ e }) => (
    <div className="hiv-tl" style={{ display: "grid", gridTemplateColumns: "92px 150px minmax(0,1fr)", gap: 14, padding: "11px 16px", borderTop: `1px solid ${HAIR}`, alignItems: "baseline" }}>
      <span style={{ fontSize: 12.5, color: MUTED, fontVariantNumeric: "tabular-nums" }}>{fmtDate(e.date)}</span>
      <span style={{ fontSize: 12.5, color: MUTED }}>{AGENCY_TAG[e.agency]}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: INK }}>{e.product}</span>
          <StatusText def={OUTCOME[e.outcome]} size={12.5} />
        </div>
        <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.55, marginTop: 2 }}>{e.text} <SourceLink href={e.src} /></div>
      </div>
    </div>
  );
  const Block = ({ title, note, rows }) => (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, marginBottom: 14, overflow: "hidden" }}>
      <div style={{ padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "baseline", background: PAPER }}>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{title}</span>
        {note && <span style={{ fontSize: 12, color: MUTED }}>{note}</span>}
      </div>
      {rows.length ? rows.map((e, i) => <Row key={i} e={e} />) : <div style={{ padding: "12px 16px", borderTop: `1px solid ${HAIR}`, fontSize: 13, color: MUTED }}>No dated decisions on record.</div>}
    </div>
  );

  return (
    <div>
      <Block title="Upcoming decisions" note={`${upcoming.length} with a published date`} rows={upcoming} />
      {years.map((y) => <Block key={y} title={y} rows={past.filter((e) => e.date.startsWith(y))} />)}
    </div>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function HivRegulatoryTracker({ live, liveStatus }) {
  const liveResult = useMemo(() => applyLive(BASE, live), [live]);
  const ALL = liveResult.products;
  const [view, setView] = useState("Regulatory");
  const [segment, setSegment] = useState("All");
  const [company, setCompany] = useState("All");
  const [openId, setOpenId] = useState(null);

  const products = useMemo(() => ALL.filter((p) =>
    (segment === "All" || p.segment === segment) && (company === "All" || p.company.includes(company))
  ), [ALL, segment, company]);
  const open = ALL.find((p) => p.id === openId);

  // Headline numbers, computed from the dataset
  const today = todayIso();
  const cells = products.flatMap((p) => REG_COLS.map((a) => ({ p, a, c: p.reg[a.key] })));
  const underReview = cells.filter((x) => x.c?.s === "review");
  const events = products.flatMap((p) => p.events.map((e) => ({ ...e, product: p.name })));
  const decisions12m = events.filter((e) => ["approved", "positive", "negative", "favourable", "restricted", "limited", "noadded", "unfavourable"].includes(e.outcome) && e.date <= today && daysBetween(e.date, today) <= 365)
    .sort((a, b) => b.date.localeCompare(a.date));
  const nextDated = events.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))[0];

  const stats = [
    { label: "Assets tracked", value: products.length, sub: `${products.filter((p) => p.segment === "Treatment").length} treatment, ${products.filter((p) => p.segment === "PrEP").length} PrEP` },
    { label: "Decisions in the last 12 months", value: decisions12m.length, sub: decisions12m.slice(0, 3).map((e) => e.product.split(" ·")[0]).join(", ") || "None" },
    { label: "Under review now", value: underReview.length, sub: underReview.map((x) => `${x.p.name.split(" ·")[0]} at ${x.a.label.replace("EMA · ", "")}`).join(", ") || "None" },
    { label: "Next dated decision", value: nextDated ? fmtDate(nextDated.date) : "None", sub: nextDated ? `${nextDated.product}, ${AGENCY_TAG[nextDated.agency]}` : "No published dates" },
  ];

  const cols = view === "Reimbursement" ? ACCESS_BODIES : REG_COLS;
  const pick = view === "Reimbursement" ? (p, k) => p.access?.[k] : (p, k) => p.reg[k];
  const groups = ["Treatment", "PrEP"].filter((g) => segment === "All" || segment === g);
  const early = EARLY_PIPELINE.filter((e) => company === "All" || e.company.includes(company));

  return (
    <div style={{ fontFamily: FONT }}>
      <style>{`
        .hiv-row:hover, .hiv-row:focus-visible { background: ${PAPER} !important; outline: none; }
        .hiv-sticky { position: sticky; left: 0; z-index: 1; box-shadow: 1px 0 0 ${LINE}; }
        .sig-row:hover { background: ${PAPER}; }
        /* Wide screens: the table scrolls with the page and its header sticks to the top.
           Narrow screens: it scrolls inside its own frame so the first column can stay pinned. */
        @media (max-width: 1080px) { .hiv-matrix { overflow: auto; max-height: 80vh; } }
        @media (max-width: 760px) {
          .hiv-tl, .sig-row { grid-template-columns: 78px minmax(0,1fr) !important; }
          .hiv-tl > span:nth-child(2), .sig-row > span:nth-child(2) { display: none; }
          .hiv-early { grid-template-columns: 1fr !important; gap: 2px !important; }
        }
      `}</style>

      {/* Headline numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", marginBottom: 20, overflow: "hidden" }}>
        {stats.map((m, i) => (
          <div key={m.label} style={{ padding: "14px 16px", borderLeft: i ? `1px solid ${HAIR}` : "none" }}>
            <div style={{ fontSize: 12.5, color: MUTED }}>{m.label}</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: INK, lineHeight: 1.25, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{m.value}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 4, lineHeight: 1.45 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Segmented label="View" value={view} onChange={setView} options={["Regulatory", "Reimbursement", "Timeline"]} />
        <Segmented label="Segment" value={segment} onChange={setSegment} options={["All", "Treatment", "PrEP"]} />
        <Segmented label="Company" value={company} onChange={setCompany} options={["All", "Gilead", "ViiV", "MSD"]} />
      </div>

      {products.length === 0 && <div style={{ padding: "2rem", textAlign: "center", fontSize: 13.5, color: MUTED, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6 }}>No assets match these filters.</div>}

      {/* Matrix */}
      {view !== "Timeline" && products.length > 0 && (
        <>
          <div className="hiv-matrix" style={{ border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff" }}>
            <div style={{ minWidth: 250 + cols.length * 172 }}>
              <div style={{ display: "grid", gridTemplateColumns: gridFor(cols.length), position: "sticky", top: 0, zIndex: 3, background: PAPER, boxShadow: `0 1px 0 ${LINE}`, borderRadius: "6px 6px 0 0" }}>
                <div className="hiv-sticky" style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: MUTED, background: PAPER }}>Asset</div>
                {cols.map((a) => (
                  <div key={a.key} style={{ padding: "10px 14px", borderLeft: `1px solid ${HAIR}` }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: INK }}>{a.label}</div>
                    <div style={{ fontSize: 11.5, color: FAINT, marginTop: 1 }}>{a.region} · {a.hint}</div>
                  </div>
                ))}
              </div>
              {groups.map((g) => {
                const rows = products.filter((p) => p.segment === g);
                if (!rows.length) return null;
                return (
                  <div key={g}>
                    <div style={{ borderTop: `1px solid ${LINE}`, background: "#f6f4ef" }}>
                      <div className="hiv-sticky" style={{ display: "inline-block", padding: "7px 16px", fontSize: 12, fontWeight: 600, color: TEXT, background: "#f6f4ef", boxShadow: "none" }}>
                        {g === "PrEP" ? "Prevention (PrEP)" : "Treatment"} <span style={{ color: FAINT, fontWeight: 400 }}>{rows.length}</span>
                      </div>
                    </div>
                    {rows.map((p) => <ProductRow key={p.id} p={p} active={openId === p.id} onOpen={() => setOpenId(p.id)} cols={cols} pick={pick} />)}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginTop: 10, fontSize: 12, color: MUTED }}>
            {(view === "Reimbursement" ? ["favourable", "listed", "restricted", "noadded", "unfavourable"] : ["approved", "positive", "review", "notapproved", "planned"]).map((k) => <StatusText key={k} def={ALL_STATUS[k]} size={12} />)}
            <span style={{ color: FAINT }}>Select an asset for sources and full history.</span>
          </div>
        </>
      )}

      {view === "Timeline" && products.length > 0 && <Timeline products={products} />}

      {/* Earlier pipeline */}
      {early.length > 0 && segment !== "PrEP" && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: INK, margin: "0 0 2px" }}>Earlier pipeline</h3>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>Assets with no regulatory filing yet.</div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, overflow: "hidden" }}>
            {early.map((e, i) => (
              <div key={e.name} className="hiv-early" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) 130px minmax(0,2fr)", gap: 14, padding: "11px 16px", borderTop: i ? `1px solid ${HAIR}` : "none", alignItems: "baseline" }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1, display: "flex", alignItems: "center" }}><Dot company={e.company} />{e.company}</div>
                </div>
                <span style={{ fontSize: 12.5, color: MUTED }}>{e.stage}</span>
                <div style={{ fontSize: 13, color: TEXT, lineHeight: 1.55 }}>{e.note} <SourceLink href={e.src} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: FAINT, lineHeight: 1.6 }}>
        {liveResult.checked > 0
          ? <><strong style={{ color: MUTED, fontWeight: 600 }}>FDA and EMA columns are checked against the official datasets each time the page loads:</strong> {liveResult.confirmed} of {liveResult.checked} statuses confirmed{liveResult.updated ? `, ${liveResult.updated} updated automatically` : ""}. </>
          : liveStatus === "loading" ? "Checking FDA and EMA statuses against the official datasets… " : "The live check against FDA and EMA datasets is unavailable right now, so curated values are shown. "}
        Swissmedic, MHRA, filings under review and planned filings are curated by hand, last checked on {fmtDate(VERIFIED_ON)}.
        Reimbursement entries (NICE, G-BA, HAS, Spezialitätenliste, Erstattungskodex) are curated by hand from each body's published decisions, last checked on {fmtDate(ACCESS_VERIFIED_ON)}; Swiss prices are public prices read from the Spezialitätenliste on that date. "Not verified" means the listing was not confirmed, not that the product is unlisted.
        "No public filing" means no announcement was found, not that none exists.
      </p>

      {open && <Drawer p={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
