// ClinicalCompare.jsx — side-by-side clinical profile of each asset, one row per asset.
// Data: src/hivClinicalData.js, each efficacy figure linked to the label or publication it came from.
import { CLINICAL, CLINICAL_VERIFIED_ON } from "./hivClinicalData";
import { FONT, INK, TEXT, MUTED, FAINT, LINE, HAIR, PAPER, fmtDate } from "./ui";

const COLUMNS = [
  { key: "route_frequency", label: "Dosing", width: 170 },
  { key: "clinic_visits", label: "Administered by", width: 170 },
  { key: "food", label: "Food", width: 130 },
  { key: "population", label: "Population", width: 200 },
  { key: "trials", label: "Pivotal trials · comparator", width: 230 },
  { key: "efficacy", label: "Efficacy", width: 280 },
  { key: "safety", label: "Safety and tolerability", width: 240 },
];

const cellText = (row, key) => key === "trials"
  ? [row.pivotal_trials, row.comparator && `vs ${row.comparator.replace(/^vs\.?\s+/i, "")}`].filter(Boolean).join(" · ")
  : row[key];

function Cell({ value, wide }) {
  const missing = !value || value === "Not verified";
  return (
    <div style={{ padding: "11px 14px", borderLeft: `1px solid ${HAIR}`, fontSize: 12.5, lineHeight: 1.5, color: missing ? FAINT : TEXT, width: wide, flexShrink: 0 }}>
      {missing ? "Not verified" : value}
    </div>
  );
}

export default function ClinicalCompare({ products, onOpen }) {
  const groups = ["Treatment", "PrEP"];
  const rows = products.map((p) => ({ p, c: CLINICAL[p.id] })).filter((r) => r.c);
  const missing = products.filter((p) => !CLINICAL[p.id]);
  const minWidth = 250 + COLUMNS.reduce((sum, c) => sum + c.width, 0);

  return (
    <div style={{ fontFamily: FONT }}>
      <div className="hiv-matrix" style={{ border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", overflowX: "auto" }}>
        <div style={{ minWidth }}>
          <div style={{ display: "flex", background: PAPER, boxShadow: `0 1px 0 ${LINE}`, position: "sticky", top: 0, zIndex: 2 }}>
            <div style={{ width: 250, flexShrink: 0, padding: "10px 16px", fontSize: 12, fontWeight: 600, color: MUTED }}>Asset</div>
            {COLUMNS.map((c) => <div key={c.key} style={{ width: c.width, flexShrink: 0, padding: "10px 14px", borderLeft: `1px solid ${HAIR}`, fontSize: 12, fontWeight: 600, color: INK }}>{c.label}</div>)}
          </div>
          {groups.map((g) => {
            const list = rows.filter((r) => r.p.segment === g);
            if (!list.length) return null;
            return (
              <div key={g}>
                <div style={{ borderTop: `1px solid ${LINE}`, background: "#f6f4ef", padding: "7px 16px", fontSize: 12, fontWeight: 600, color: TEXT }}>
                  {g === "PrEP" ? "Prevention (PrEP)" : "Treatment"} <span style={{ color: FAINT, fontWeight: 400 }}>{list.length}</span>
                </div>
                {list.map(({ p, c }) => (
                  <div key={p.id} style={{ display: "flex", borderTop: `1px solid ${HAIR}` }}>
                    <div role="button" tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={(e) => { if (e.key === "Enter") onOpen(p.id); }}
                      style={{ width: 250, flexShrink: 0, padding: "11px 16px", cursor: "pointer" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.company} · {p.stage}</div>
                      {c.status_note && <div style={{ fontSize: 11.5, color: FAINT, marginTop: 4 }}>{c.status_note}</div>}
                      {c.source && <a href={c.source} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: "inline-block", fontSize: 11.5, color: MUTED, marginTop: 6 }}>Source: {c.source_label || "link"} ↗</a>}
                      {(c.additional_sources || []).map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ fontSize: 11.5, color: MUTED, marginLeft: 6 }}>[{i + 2}]</a>)}
                    </div>
                    {COLUMNS.map((col) => <Cell key={col.key} value={cellText(c, col.key)} wide={col.width} />)}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
        Results come from each asset's pivotal trials and are not head-to-head unless the comparator says so; trials differ in population and design.
        Checked against the cited label or publication on {fmtDate(CLINICAL_VERIFIED_ON)}. "Not verified" means no source was confirmed.
        {missing.length > 0 && ` No clinical profile yet for: ${missing.map((p) => p.name).join(", ")}.`}
      </div>
    </div>
  );
}
