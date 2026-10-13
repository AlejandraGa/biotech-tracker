// MultiSelect.jsx — dropdown with checkboxes, used by the News filters.
// Same behaviour as the one in the HIV tracker tables.
import { useEffect, useRef, useState } from "react";
import { FONT, INK, TEXT, MUTED, LINE, HAIR } from "./ui";

// Multi-select dropdown. "All" ticks every box; an empty selection is stored as "all", so unticking one box shows the rest.
export default function MultiSelect({ label, allLabel, selected, onChange, options }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const isAll = selected.length === 0 || selected.length === opts.length;
  const isOn = (v) => isAll || selected.includes(v);
  const picked = opts.filter((o) => selected.includes(o.value));
  const summary = isAll ? allLabel : picked.length <= 2 ? picked.map((o) => o.label).join(", ") : `${picked.length} of ${opts.length} selected`;
  const toggle = (v) => {
    const base = isAll ? opts.map((o) => o.value) : selected;
    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    onChange(next.length === opts.length ? [] : next);
  };
  return (
    <div ref={ref} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: MUTED }}>
      {label}
      <span style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        style={{ fontFamily: FONT, fontSize: 12.5, color: TEXT, padding: "6px 10px", border: "1px solid #d3cec6", borderRadius: 6, background: "#fff", cursor: "pointer", minWidth: 150, maxWidth: 260, display: "inline-flex", justifyContent: "space-between", gap: 10 }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{summary}</span>
        <span aria-hidden="true" style={{ color: MUTED }}>▾</span>
      </button>
      {open && (
        <div role="listbox" aria-multiselectable="true" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 20, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.10)", padding: 6, minWidth: 220, maxHeight: 320, overflowY: "auto" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 13, fontWeight: 600, color: INK, cursor: "pointer", borderBottom: `1px solid ${HAIR}`, marginBottom: 2 }}>
            <input type="checkbox" checked={isAll} onChange={() => onChange([])} />
            {allLabel}
          </label>
          {opts.map((o) => (
            <label key={o.value} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", fontSize: 13, color: TEXT, cursor: "pointer", borderRadius: 4 }}>
              <input type="checkbox" checked={isOn(o.value)} onChange={() => toggle(o.value)} />
              {o.label}
            </label>
          ))}
        </div>
      )}
      </span>
    </div>
  );
}
