import { useState, useCallback, useEffect, useRef } from "react";

// ─── CLINICALTRIALS.GOV API ─────────────────────────────────────────────────
// Uses the public v2 API — no key required
// Docs: https://clinicaltrials.gov/data-api/api
async function searchClinicalTrials({ condition, intervention, status = "ALL" }) {
  const params = new URLSearchParams({
    "query.cond": condition,
    "query.intr": intervention || "",
    "filter.overallStatus": status === "ALL"
      ? "RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING,COMPLETED,TERMINATED,SUSPENDED"
      : status,
    "fields": "NCTId,BriefTitle,OfficialTitle,LeadSponsorName,OverallStatus,Phase,StartDate,CompletionDate,PrimaryCompletionDate,Condition,InterventionName,InterventionType,StudyType,EnrollmentCount,LocationCountry,LastUpdatePostDate,BriefSummary",
    "pageSize": "40",
    "sort": "LastUpdatePostDate:desc",
  });

  // Remove empty params
  if (!intervention) params.delete("query.intr");

  const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ClinicalTrials API error: ${res.status}`);
  const data = await res.json();
  return data.studies || [];
}

function extractStudyFields(study) {
  const p = study.protocolSection || {};
  const id = p.identificationModule || {};
  const status = p.statusModule || {};
  const sponsor = p.sponsorCollaboratorsModule || {};
  const design = p.designModule || {};
  const desc = p.descriptionModule || {};
  const arms = p.armsInterventionsModule || {};
  const locations = p.contactsLocationsModule || {};

  const countries = [...new Set(
    (locations.locations || []).map(l => l.country).filter(Boolean)
  )].slice(0, 5);

  const interventions = (arms.interventions || [])
    .filter(i => i.type === "DRUG" || i.type === "BIOLOGICAL" || i.type === "GENETIC")
    .map(i => i.name)
    .slice(0, 3);

  return {
    nctId: id.nctId || "",
    title: id.briefTitle || id.officialTitle || "Untitled",
    sponsor: sponsor.leadSponsor?.name || "Unknown",
    status: status.overallStatus || "Unknown",
    phase: (design.phases || []).join("/") || "N/A",
    startDate: status.startDateStruct?.date || "",
    completionDate: status.primaryCompletionDateStruct?.date || status.completionDateStruct?.date || "",
    enrollment: design.enrollmentInfo?.count || null,
    countries,
    interventions,
    summary: desc.briefSummary || "",
    lastUpdate: status.lastUpdatePostDateStruct?.date || "",
  };
}

// ─── PHASE HELPERS ─────────────────────────────────────────────────────────
const PHASE_ORDER = {
  "EARLY_PHASE1": 0, "PHASE1": 1, "PHASE1/PHASE2": 2, "PHASE2": 3,
  "PHASE2/PHASE3": 4, "PHASE3": 5, "PHASE4": 6, "N/A": -1,
};

function normalizePhase(phase) {
  if (!phase || phase === "N/A") return "N/A";
  return phase.replace(/\//g, "/").toUpperCase().replace("PHASE", "Phase ").replace("_", " ").replace("EARLY PHASE", "Early Phase ");
}

function phaseBadgeStyle(phase) {
  const p = (phase || "").toUpperCase();
  if (p.includes("PHASE3") || p.includes("PHASE 3") || p.includes("4")) return { bg: "rgba(29,78,216,0.09)", color: "#1d4ed8", border: "rgba(29,78,216,0.3)" };
  if (p.includes("PHASE2") || p.includes("PHASE 2")) return { bg: "rgba(161,98,7,0.09)", color: "#a16207", border: "rgba(161,98,7,0.3)" };
  if (p.includes("PHASE1") || p.includes("PHASE 1")) return { bg: "rgba(109,40,217,0.09)", color: "#6d28d9", border: "rgba(109,40,217,0.3)" };
  if (p.includes("EARLY")) return { bg: "rgba(100,100,100,0.07)", color: "#666", border: "rgba(100,100,100,0.2)" };
  return { bg: "#f0ede8", color: "#888", border: "#e5e0d8" };
}

function statusStyle(status) {
  const s = (status || "").toUpperCase();
  if (s === "RECRUITING") return { color: "#15803d", bg: "rgba(22,163,74,0.08)", label: "● Recruiting" };
  if (s === "ACTIVE_NOT_RECRUITING") return { color: "#1d4ed8", bg: "rgba(29,78,216,0.07)", label: "◉ Active" };
  if (s === "COMPLETED") return { color: "#555", bg: "rgba(100,100,100,0.07)", label: "✓ Completed" };
  if (s === "NOT_YET_RECRUITING") return { color: "#a16207", bg: "rgba(161,98,7,0.07)", label: "○ Not yet recruiting" };
  if (s === "TERMINATED" || s === "SUSPENDED") return { color: "#c8102e", bg: "rgba(200,16,46,0.07)", label: "✕ " + status };
  return { color: "#888", bg: "#f0ede8", label: status };
}

// Group studies by sponsor, pick highest-phase per sponsor
function groupBySponsor(studies) {
  const map = {};
  for (const s of studies) {
    const key = s.sponsor.toLowerCase().replace(/\s+(inc\.?|ltd\.?|sa|ag|plc|gmbh|nv|bv|corp\.?)$/i, "").trim();
    if (!map[key]) map[key] = { sponsor: s.sponsor, studies: [] };
    map[key].studies.push(s);
  }
  return Object.values(map).map(g => ({
    ...g,
    leadStudy: g.studies.sort((a, b) => (PHASE_ORDER[b.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] || 0) - (PHASE_ORDER[a.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] || 0))[0],
    allStudies: g.studies,
  })).sort((a, b) => {
    const pa = PHASE_ORDER[a.leadStudy?.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] || 0;
    const pb = PHASE_ORDER[b.leadStudy?.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] || 0;
    return pb - pa;
  });
}

// ─── AI CALL ────────────────────────────────────────────────────────────────
async function callClaude(prompt) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await response.json();
  return data.content?.[0]?.text || "Could not generate response.";
}

// ─── STYLES ─────────────────────────────────────────────────────────────────
const mono = "'DM Mono', monospace";
const serif = "'Georgia', serif";

const S = {
  btn: (color = "#1a1a1a") => ({
    background: color, border: "none", borderRadius: 4, padding: "8px 16px",
    color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 700,
    fontFamily: mono, letterSpacing: "0.5px", display: "inline-flex",
    alignItems: "center", gap: 6,
  }),
  btnGhost: {
    background: "transparent", border: "1px solid #d1ccc4", borderRadius: 4,
    padding: "6px 12px", color: "#555", fontSize: 11, cursor: "pointer",
    fontFamily: mono,
  },
  label: {
    fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase",
    color: "#aaa", fontFamily: mono, marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase",
    color: "#c8102e", fontFamily: mono, borderBottom: "1px solid #e5e0d8",
    paddingBottom: 4, marginBottom: 12,
  },
  input: {
    background: "#fff", border: "1px solid #d1ccc4", borderRadius: 6,
    padding: "10px 14px", color: "#1a1a1a", fontSize: 13, outline: "none",
    width: "100%", fontFamily: serif,
  },
  card: {
    background: "#fff", border: "1px solid #e5e0d8", borderRadius: 10,
    overflow: "hidden", marginBottom: 10,
  },
  aiBox: {
    background: "#faf8f4", borderRadius: 6, padding: "12px 16px",
    fontSize: 13, color: "#333", lineHeight: 1.75, border: "1px solid #e5e0d8",
    fontFamily: serif, borderLeft: "3px solid #065f46", whiteSpace: "pre-line",
  },
  metric: {
    background: "#fff", borderRadius: 8, padding: "12px 14px",
    border: "1px solid #e5e0d8",
  },
};

function Spinner({ color = "#c8102e" }) {
  return (
    <span style={{
      display: "inline-block", width: 11, height: 11,
      border: `1.5px solid #ddd`, borderTopColor: color,
      borderRadius: "50%", animation: "spin 0.7s linear infinite",
    }} />
  );
}

function Tag({ label, color = "#555", bg = "#f0ede8", border = "#e5e0d8" }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 4,
      background: bg, color, border: `0.5px solid ${border}`,
      fontFamily: mono, fontWeight: 600, whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

// ─── ONBOARDING MODAL ──────────────────────────────────────────────────────
const SUGGESTED_SEARCHES = [
  { label: "Anti-amyloid · Alzheimer's", condition: "Alzheimer's Disease", intervention: "amyloid" },
  { label: "CAR-T · Hematologic cancers", condition: "Leukemia OR Lymphoma", intervention: "CAR-T" },
  { label: "GLP-1 · Obesity / T2D", condition: "Obesity OR Type 2 Diabetes", intervention: "GLP-1" },
  { label: "Gene therapy · Rare disease", condition: "Rare Disease OR Orphan", intervention: "gene therapy" },
  { label: "PD-1/L1 · Solid tumors", condition: "Solid Tumor", intervention: "PD-1 OR PD-L1" },
  { label: "CRISPR · Hemoglobinopathies", condition: "Sickle Cell OR Thalassemia", intervention: "CRISPR" },
  { label: "Anti-IL · Atopic Dermatitis", condition: "Atopic Dermatitis", intervention: "interleukin" },
  { label: "KRAS · NSCLC", condition: "Non-Small Cell Lung Cancer", intervention: "KRAS" },
];

function OnboardingModal({ onSearch, existingSpaces }) {
  const [condition, setCondition] = useState("");
  const [intervention, setIntervention] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!condition.trim()) { setError("Please enter a disease area or condition."); return; }
    setError("");
    onSearch({ condition: condition.trim(), intervention: intervention.trim(), status: statusFilter, label: condition.trim() });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(10,10,10,0.55)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, backdropFilter: "blur(3px)",
    }}>
      <div style={{
        background: "#fefcf9", borderRadius: 12, width: "100%", maxWidth: 560,
        border: "1px solid #e5e0d8", overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #e5e0d8" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#c8102e", fontFamily: mono, marginBottom: 8 }}>
            Competitive Landscape · Configure
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111", margin: 0, fontFamily: serif, letterSpacing: "-0.3px" }}>
            Define your competitive space
          </h2>
          <p style={{ fontSize: 13, color: "#666", marginTop: 8, marginBottom: 0, lineHeight: 1.6, fontFamily: serif }}>
            Pull live data from ClinicalTrials.gov to map who's competing in your space, what phase they're at, and what markets they're targeting.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
          {/* Quick suggestions */}
          <div style={{ marginBottom: 20 }}>
            <div style={S.label}>Quick-start · Common spaces</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {SUGGESTED_SEARCHES.map(s => (
                <button key={s.label} onClick={() => { setCondition(s.condition); setIntervention(s.intervention); }}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid #d1ccc4", background: condition === s.condition ? "#1a1a1a" : "#fff", color: condition === s.condition ? "#fff" : "#444", fontSize: 11, cursor: "pointer", fontFamily: mono, transition: "all 0.15s", fontWeight: condition === s.condition ? 700 : 400 }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={S.label}>Disease area / Condition <span style={{ color: "#c8102e" }}>*</span></div>
              <input style={S.input} value={condition} onChange={e => { setCondition(e.target.value); setError(""); }}
                placeholder="e.g. Atopic Dermatitis, Non-Small Cell Lung Cancer, Haemophilia B…"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            <div>
              <div style={S.label}>Intervention / Target / MoA <span style={{ color: "#aaa", fontWeight: 400 }}>(optional — narrows results)</span></div>
              <input style={S.input} value={intervention} onChange={e => setIntervention(e.target.value)}
                placeholder="e.g. interleukin, PD-1, gene therapy, CRISPR, GLP-1…"
                onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            </div>
            <div>
              <div style={S.label}>Trial status</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { key: "ALL", label: "All statuses" },
                  { key: "ACTIVE", label: "Active only" },
                  { key: "RECRUITING", label: "Recruiting" },
                  { key: "COMPLETED", label: "Completed" },
                ].map(o => (
                  <button key={o.key} onClick={() => setStatusFilter(o.key)}
                    style={{ padding: "5px 12px", borderRadius: 4, border: statusFilter === o.key ? "1.5px solid #1a1a1a" : "1px solid #d1ccc4", background: statusFilter === o.key ? "#1a1a1a" : "transparent", color: statusFilter === o.key ? "#fff" : "#555", fontSize: 11, cursor: "pointer", fontFamily: mono, fontWeight: statusFilter === o.key ? 700 : 400 }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div style={{ marginTop: 10, fontSize: 12, color: "#c8102e", fontFamily: mono }}>— {error}</div>}

          {/* Existing spaces */}
          {existingSpaces.length > 0 && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: "#f5f2ed", borderRadius: 6 }}>
              <div style={S.label}>Your saved spaces</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {existingSpaces.map(sp => (
                  <button key={sp.id} onClick={() => onSearch({ ...sp, reuse: true })}
                    style={{ padding: "4px 12px", borderRadius: 4, border: "1px solid #d1ccc4", background: "#fff", color: "#333", fontSize: 11, cursor: "pointer", fontFamily: mono }}>
                    {sp.label} <span style={{ color: "#aaa", fontSize: 10 }}>↩</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e5e0d8", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#faf8f4" }}>
          <span style={{ fontSize: 11, color: "#aaa", fontFamily: mono }}>
            Data: ClinicalTrials.gov · Live API
          </span>
          <button style={S.btn()} onClick={handleSubmit}>
            Search landscape →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── STUDY DETAIL DRAWER ────────────────────────────────────────────────────
function StudyDrawer({ study, onClose }) {
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const phase = phaseBadgeStyle(study.phase);
  const status = statusStyle(study.status);

  const handleAI = async () => {
    if (aiAnalysis) return;
    setLoadingAI(true);
    try {
      const text = await callClaude(
        `You are a market access strategist. Analyze this clinical trial from a competitive intelligence perspective in 4 bullet points (use • as bullet):
        
        Title: ${study.title}
        Sponsor: ${study.sponsor}
        Phase: ${study.phase}
        Status: ${study.status}
        Interventions: ${study.interventions.join(", ") || "N/A"}
        Countries: ${study.countries.join(", ") || "N/A"}
        Enrollment: ${study.enrollment || "N/A"}
        Expected completion: ${study.completionDate || "N/A"}
        Summary: ${study.summary?.slice(0, 400) || "N/A"}
        
        Cover: (1) what this trial signals about ${study.sponsor}'s market access strategy, (2) which markets they seem to be prioritizing based on countries and design, (3) likely HTA evidence implications when they file, (4) threat level for a competitor in the same space. Be specific and commercial.`
      );
      setAiAnalysis(text);
    } catch { setAiAnalysis("Could not generate analysis."); }
    setLoadingAI(false);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 900, display: "flex",
      justifyContent: "flex-end",
    }} onClick={onClose}>
      <div style={{
        width: "100%", maxWidth: 480, height: "100%", background: "#fefcf9",
        borderLeft: "1px solid #e5e0d8", overflow: "auto", padding: "24px",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.1)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ flex: 1, paddingRight: 16 }}>
            <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 10, color: "#c8102e", fontFamily: mono, fontWeight: 700, textDecoration: "none" }}>
              {study.nctId} ↗
            </a>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "6px 0 0", fontFamily: serif, lineHeight: 1.4 }}>{study.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#bbb", cursor: "pointer", flexShrink: 0 }}>×</button>
        </div>

        {/* Key facts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Sponsor", val: study.sponsor },
            { label: "Phase", val: normalizePhase(study.phase) },
            { label: "Status", val: study.status.replace(/_/g, " ") },
            { label: "Enrollment", val: study.enrollment ? `${study.enrollment.toLocaleString()} pts` : "N/A" },
            { label: "Started", val: study.startDate || "N/A" },
            { label: "Est. completion", val: study.completionDate || "N/A" },
          ].map(f => (
            <div key={f.label} style={{ background: "#f5f2ed", borderRadius: 6, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: "#aaa", fontFamily: mono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 600, fontFamily: mono }}>{f.val}</div>
            </div>
          ))}
        </div>

        {/* Interventions */}
        {study.interventions.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Interventions</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {study.interventions.map((i, idx) => <Tag key={idx} label={i} color="#1d4ed8" bg="rgba(29,78,216,0.07)" border="rgba(29,78,216,0.2)" />)}
            </div>
          </div>
        )}

        {/* Countries */}
        {study.countries.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Countries</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {study.countries.map((c, idx) => <Tag key={idx} label={c} />)}
            </div>
          </div>
        )}

        {/* Summary */}
        {study.summary && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ ...S.label, marginBottom: 6 }}>Brief summary</div>
            <p style={{ fontSize: 12, color: "#444", lineHeight: 1.7, margin: 0, fontFamily: serif }}>
              {study.summary.slice(0, 500)}{study.summary.length > 500 ? "…" : ""}
            </p>
          </div>
        )}

        {/* AI Analysis */}
        <button style={S.btn("#065f46")} onClick={handleAI}>
          {loadingAI ? <><Spinner color="#fff" />Analyzing…</> : aiAnalysis ? "MA Analysis ✓" : "→ MA Analysis"}
        </button>
        {loadingAI && <div style={{ marginTop: 12, color: "#888", fontSize: 12, fontFamily: mono, display: "flex", gap: 8, alignItems: "center" }}><Spinner />Generating market access analysis…</div>}
        {aiAnalysis && <div style={{ ...S.aiBox, marginTop: 12 }}>{aiAnalysis}</div>}

        <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 20, fontSize: 11, color: "#c8102e", fontFamily: mono, textDecoration: "none", fontWeight: 700 }}>
          View on ClinicalTrials.gov ↗
        </a>
      </div>
    </div>
  );
}

// ─── SPONSOR CARD ────────────────────────────────────────────────────────────
function SponsorCard({ group, rank, searchQuery }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const lead = group.leadStudy;
  const phase = phaseBadgeStyle(lead.phase);
  const status = statusStyle(lead.status);
  const otherStudies = group.allStudies.filter(s => s.nctId !== lead.nctId);

  const handleAI = async (e) => {
    e.stopPropagation();
    if (aiSummary) { setExpanded(true); return; }
    setLoadingAI(true);
    setExpanded(true);
    try {
      const studies = group.allStudies.slice(0, 4);
      const studiesSummary = studies.map(s =>
        `  - ${normalizePhase(s.phase)} | ${s.status.replace(/_/g," ")} | Countries: ${s.countries.join(", ") || "N/A"} | ${s.title.slice(0,80)}`
      ).join("\n");

      const text = await callClaude(
        `You are a market access strategist at a small pharma company working in: ${searchQuery.condition}${searchQuery.intervention ? " / " + searchQuery.intervention : ""}.
        
        Analyze competitor ${group.sponsor} in 3 bullet points (use • as bullet):
        They have ${group.allStudies.length} trial(s):
        ${studiesSummary}
        
        Cover: (1) their development stage and timeline threat to your program, (2) their apparent geographic/market access strategy based on countries, (3) one specific thing you should watch or do differently to compete. Be direct, 2 sentences max per bullet.`
      );
      setAiSummary(text);
    } catch { setAiSummary("Could not generate analysis."); }
    setLoadingAI(false);
  };

  const RANK_COLORS = ["#c8102e", "#1d4ed8", "#7c3aed", "#065f46", "#a16207"];
  const rankColor = RANK_COLORS[Math.min(rank, RANK_COLORS.length - 1)];

  return (
    <>
      {selectedStudy && <StudyDrawer study={selectedStudy} onClose={() => setSelectedStudy(null)} />}
      <div style={S.card}>
        {/* Main row */}
        <div style={{ padding: "14px 18px", cursor: "pointer", borderBottom: expanded ? "1px solid #f0ede8" : "none" }}
          onClick={() => setExpanded(x => !x)}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            {/* Rank */}
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `rgba(${rankColor === "#c8102e" ? "200,16,46" : rankColor === "#1d4ed8" ? "29,78,216" : rankColor === "#7c3aed" ? "124,58,237" : rankColor === "#065f46" ? "6,95,70" : "161,98,7"},0.1)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: rankColor, fontFamily: mono }}>#{rank + 1}</span>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#111", fontFamily: serif }}>{group.sponsor}</span>
                {group.allStudies.length > 1 && (
                  <span style={{ fontSize: 10, color: "#888", fontFamily: mono, background: "#f5f2ed", padding: "2px 7px", borderRadius: 10 }}>
                    {group.allStudies.length} trials
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 8, fontFamily: serif, lineHeight: 1.4 }}>
                {lead.title.slice(0, 100)}{lead.title.length > 100 ? "…" : ""}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 10, background: phase.bg, color: phase.color, border: `0.5px solid ${phase.border}`, fontWeight: 700, fontFamily: mono }}>
                  {normalizePhase(lead.phase)}
                </span>
                <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 10, background: status.bg, color: status.color, fontWeight: 600, fontFamily: mono }}>
                  {status.label}
                </span>
                {lead.countries.slice(0, 3).map(c => <Tag key={c} label={c} />)}
                {lead.countries.length > 3 && <span style={{ fontSize: 10, color: "#aaa", fontFamily: mono }}>+{lead.countries.length - 3}</span>}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
              <button style={S.btn("#065f46")} onClick={handleAI}>
                {loadingAI ? <><Spinner color="#fff" />…</> : aiSummary ? "Intel ✓" : "Intel →"}
              </button>
              <span style={{ fontSize: 16, color: "#ccc", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>⌄</span>
            </div>
          </div>
        </div>

        {/* Expanded */}
        {expanded && (
          <div style={{ background: "#fdfcfa" }}>
            {/* Lead study details */}
            <div style={{ padding: "14px 18px", borderBottom: otherStudies.length > 0 ? "1px solid #f0ede8" : "none" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#c8102e", fontFamily: mono, marginBottom: 10 }}>Lead Trial</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Enrollment", val: lead.enrollment ? `${lead.enrollment.toLocaleString()} pts` : "N/A" },
                  { label: "Start", val: lead.startDate || "N/A" },
                  { label: "Est. completion", val: lead.completionDate || "N/A" },
                  { label: "NCT", val: lead.nctId },
                ].map(f => (
                  <div key={f.label} style={{ background: "#f5f2ed", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 9, color: "#aaa", fontFamily: mono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 11, color: "#333", fontWeight: 600, fontFamily: mono }}>{f.val}</div>
                  </div>
                ))}
              </div>
              {lead.interventions.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: "#aaa", fontFamily: mono, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 5 }}>Interventions</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {lead.interventions.map((i, idx) => <Tag key={idx} label={i} color="#1d4ed8" bg="rgba(29,78,216,0.07)" border="rgba(29,78,216,0.2)" />)}
                  </div>
                </div>
              )}
              <button style={{ ...S.btnGhost, fontSize: 10 }} onClick={() => setSelectedStudy(lead)}>
                View full details →
              </button>
            </div>

            {/* Other studies */}
            {otherStudies.length > 0 && (
              <div style={{ padding: "12px 18px", borderBottom: aiSummary ? "1px solid #f0ede8" : "none" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#888", fontFamily: mono, marginBottom: 8 }}>
                  Other trials ({otherStudies.length})
                </div>
                {otherStudies.map(s => {
                  const st = statusStyle(s.status);
                  const ph = phaseBadgeStyle(s.phase);
                  return (
                    <div key={s.nctId} onClick={() => setSelectedStudy(s)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #f5f2ed", cursor: "pointer" }}
                      onMouseOver={e => e.currentTarget.style.background = "#f8f6f2"}
                      onMouseOut={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: ph.bg, color: ph.color, fontFamily: mono, fontWeight: 700, flexShrink: 0 }}>
                        {normalizePhase(s.phase)}
                      </span>
                      <span style={{ fontSize: 11, color: "#333", flex: 1, lineHeight: 1.4, fontFamily: serif }}>
                        {s.title.slice(0, 90)}{s.title.length > 90 ? "…" : ""}
                      </span>
                      <span style={{ fontSize: 10, color: st.color, fontFamily: mono, fontWeight: 600, flexShrink: 0 }}>{st.label}</span>
                      <span style={{ fontSize: 11, color: "#c8102e", fontFamily: mono }}>→</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI summary */}
            {(loadingAI || aiSummary) && (
              <div style={{ padding: "14px 18px" }}>
                {loadingAI && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 12, fontFamily: mono }}>
                    <Spinner />Generating competitive intelligence…
                  </div>
                )}
                {aiSummary && (
                  <div style={S.aiBox}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#065f46", fontFamily: mono, marginBottom: 8 }}>
                      AI · Competitive Intelligence
                    </div>
                    {aiSummary}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function CompetitiveLandscape() {
  const [spaces, setSpaces] = useState([]); // saved search spaces
  const [activeSpace, setActiveSpace] = useState(null);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [aiOverview, setAiOverview] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [sortBy, setSortBy] = useState("phase"); // phase | sponsor | updated

  const handleSearch = useCallback(async ({ condition, intervention, status, label, reuse }) => {
    setShowModal(false);
    setError("");
    setStudies([]);
    setAiOverview("");

    const space = { id: Date.now(), condition, intervention, status, label };
    if (!reuse) {
      setSpaces(prev => {
        const existing = prev.find(s => s.condition === condition && s.intervention === intervention);
        return existing ? prev : [space, ...prev].slice(0, 8);
      });
    }
    setActiveSpace(space);
    setLoading(true);

    try {
      const raw = await searchClinicalTrials({ condition, intervention, status });
      const extracted = raw.map(extractStudyFields);
      setStudies(extracted);
    } catch (e) {
      setError("Could not reach ClinicalTrials.gov. Check your connection and try again.");
    }
    setLoading(false);
  }, []);

  // Filter + group
  const filtered = studies.filter(s => {
    if (phaseFilter !== "ALL") {
      const p = (s.phase || "").toUpperCase().replace(/\s/g,"_").replace("/","_");
      if (!p.includes(phaseFilter.replace(/\s/g,"_"))) return false;
    }
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    if (searchText) {
      const hay = (s.sponsor + " " + s.title + " " + s.interventions.join(" ") + " " + s.countries.join(" ")).toLowerCase();
      if (!hay.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = groupBySponsor(filtered);

  // Sort groups
  const sorted = [...grouped].sort((a, b) => {
    if (sortBy === "phase") {
      const pa = PHASE_ORDER[a.leadStudy?.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] ?? -1;
      const pb = PHASE_ORDER[b.leadStudy?.phase?.toUpperCase().replace(/\s/g,"_").replace("/","_")] ?? -1;
      return pb - pa;
    }
    if (sortBy === "sponsor") return a.sponsor.localeCompare(b.sponsor);
    if (sortBy === "trials") return b.allStudies.length - a.allStudies.length;
    return 0;
  });

  const handleOverview = async () => {
    if (aiOverview || !activeSpace) return;
    setLoadingOverview(true);
    try {
      const top5 = sorted.slice(0, 5).map(g =>
        `${g.sponsor}: ${normalizePhase(g.leadStudy.phase)}, ${g.allStudies.length} trial(s), countries: ${g.leadStudy.countries.slice(0,3).join(", ") || "N/A"}`
      ).join("\n");
      const text = await callClaude(
        `You are a market access director at a small pharma company. Based on this competitive landscape in ${activeSpace.condition}${activeSpace.intervention ? " / " + activeSpace.intervention : ""}, write a 3-paragraph strategic briefing:
        
        Top competitors:
        ${top5}
        Total players tracked: ${sorted.length}
        
        Para 1: Current competitive intensity and what phase the market is at.
        Para 2: Geographic patterns and HTA implications (which markets are being targeted and what that means for reimbursement).
        Para 3: One concrete differentiation recommendation for a late-stage entrant or smaller company. 
        
        Be direct, commercial, and specific. No hedging.`
      );
      setAiOverview(text);
    } catch { setAiOverview("Could not generate overview."); }
    setLoadingOverview(false);
  };

  const phaseCounts = { Phase3: 0, Phase2: 0, Phase1: 0, Other: 0 };
  filtered.forEach(s => {
    const p = (s.phase || "").toUpperCase();
    if (p.includes("PHASE3") || p.includes("PHASE 3") || p.includes("PHASE4")) phaseCounts.Phase3++;
    else if (p.includes("PHASE2") || p.includes("PHASE 2")) phaseCounts.Phase2++;
    else if (p.includes("PHASE1") || p.includes("PHASE 1")) phaseCounts.Phase1++;
    else phaseCounts.Other++;
  });

  return (
    <div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .cl-card { animation: fadeIn 0.25s ease both; }
      `}</style>

      {showModal && (
        <OnboardingModal onSearch={handleSearch} existingSpaces={spaces} />
      )}

      {/* Header */}
      <div style={{ borderTop: "3px solid #1a1a1a", borderBottom: "1px solid #1a1a1a", padding: "0.5rem 0", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span style={{ fontSize: 10, color: "#555", letterSpacing: "0.5px", textTransform: "uppercase", fontFamily: mono }}>
          Competitive Landscape · Live Data
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeSpace && (
            <span style={{ fontSize: 10, color: "#1d4ed8", fontFamily: mono, fontWeight: 700, background: "rgba(29,78,216,0.07)", padding: "3px 10px", borderRadius: 4 }}>
              {activeSpace.condition}{activeSpace.intervention ? " · " + activeSpace.intervention : ""}
            </span>
          )}
          <span style={{ fontSize: 10, color: "#065f46", fontFamily: mono, fontWeight: 700 }}>ClinicalTrials.gov · Live</span>
        </div>
      </div>

      {/* Active space bar */}
      {activeSpace && !loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
          <div style={{ flex: 1, padding: "10px 16px", background: "#f5f2ed", borderRadius: 8, border: "1px solid #e5e0d8", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#1a1a1a", fontFamily: serif }}>{activeSpace.condition}</span>
            {activeSpace.intervention && <span style={{ fontSize: 11, color: "#888", fontFamily: mono }}>· {activeSpace.intervention}</span>}
            <span style={{ fontSize: 10, color: "#aaa", fontFamily: mono }}>· {studies.length} trials found · {sorted.length} sponsors</span>
          </div>
          <button style={S.btn()} onClick={() => setShowModal(true)}>
            Change space →
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", width: 48, height: 48 }}>
              <span style={{ position: "absolute", inset: 0, border: "2px solid #e5e0d8", borderTopColor: "#c8102e", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "block" }} />
            </div>
            <div style={{ fontSize: 12, color: "#888", fontFamily: mono, letterSpacing: "0.5px" }}>
              Querying ClinicalTrials.gov…
            </div>
            <div style={{ fontSize: 11, color: "#bbb", fontFamily: mono }}>
              {activeSpace?.condition}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ padding: "20px 24px", background: "rgba(200,16,46,0.05)", border: "1px solid rgba(200,16,46,0.2)", borderRadius: 8, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#c8102e", fontFamily: mono }}>{error}</div>
          <button style={{ ...S.btn("#c8102e"), marginTop: 12, fontSize: 10 }} onClick={() => activeSpace && handleSearch(activeSpace)}>
            Retry →
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && studies.length > 0 && (
        <>
          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px,1fr))", gap: 10, marginBottom: "1.25rem" }}>
            {[
              { label: "Sponsors", val: sorted.length, color: "#1a1a1a" },
              { label: "Phase 3+", val: phaseCounts.Phase3, color: "#1d4ed8" },
              { label: "Phase 2", val: phaseCounts.Phase2, color: "#a16207" },
              { label: "Phase 1", val: phaseCounts.Phase1, color: "#6d28d9" },
              { label: "Total trials", val: filtered.length, color: "#555" },
            ].map(m => (
              <div key={m.label} style={S.metric}>
                <div style={{ fontSize: 10, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: mono, marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: m.color, fontFamily: mono }}>{m.val}</div>
              </div>
            ))}
          </div>

          {/* AI Overview */}
          <div style={{ marginBottom: "1.25rem" }}>
            <button style={S.btn("#065f46")} onClick={handleOverview}>
              {loadingOverview ? <><Spinner color="#fff" />Analyzing landscape…</> : aiOverview ? "Strategic Briefing ✓" : "→ Generate strategic briefing"}
            </button>
            {aiOverview && (
              <div style={{ ...S.aiBox, marginTop: 12 }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#065f46", fontFamily: mono, marginBottom: 10 }}>
                  AI · Competitive Landscape Briefing · {activeSpace?.condition}
                </div>
                {aiOverview}
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, padding: "14px 16px", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={S.label}>Filter by phase</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {[
                    { key: "ALL", label: "All" },
                    { key: "PHASE3", label: "Phase 3+" },
                    { key: "PHASE2", label: "Phase 2" },
                    { key: "PHASE1", label: "Phase 1" },
                  ].map(o => (
                    <button key={o.key} onClick={() => setPhaseFilter(o.key)}
                      style={{ padding: "4px 10px", borderRadius: 4, border: phaseFilter === o.key ? "1.5px solid #1a1a1a" : "1px solid #d1ccc4", background: phaseFilter === o.key ? "#1a1a1a" : "transparent", color: phaseFilter === o.key ? "#fff" : "#555", fontSize: 11, cursor: "pointer", fontFamily: mono, fontWeight: phaseFilter === o.key ? 700 : 400 }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={S.label}>Sort by</div>
                <div style={{ display: "flex", gap: 5 }}>
                  {[{ key: "phase", label: "Phase" }, { key: "trials", label: "# Trials" }, { key: "sponsor", label: "Sponsor A-Z" }].map(o => (
                    <button key={o.key} onClick={() => setSortBy(o.key)}
                      style={{ padding: "4px 10px", borderRadius: 4, border: sortBy === o.key ? "1.5px solid #1d4ed8" : "1px solid #d1ccc4", background: sortBy === o.key ? "rgba(29,78,216,0.07)" : "transparent", color: sortBy === o.key ? "#1d4ed8" : "#555", fontSize: 11, cursor: "pointer", fontFamily: mono, fontWeight: sortBy === o.key ? 700 : 400 }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 2, minWidth: 220 }}>
                <div style={S.label}>Search</div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input style={{ ...S.input, padding: "6px 12px", fontSize: 12 }} value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Filter by sponsor, drug, country…" />
                  {searchText && <button style={S.btnGhost} onClick={() => setSearchText("")}>Clear</button>}
                </div>
              </div>
            </div>
          </div>

          {/* Results header */}
          <div style={S.sectionTitle}>
            {sorted.length} sponsors · {filtered.length} trials · ranked by phase
          </div>

          {/* Cards */}
          {sorted.length === 0 && (
            <div style={{ textAlign: "center", padding: "3rem", color: "#888", fontSize: 13, fontFamily: mono }}>
              No results match your filters.
            </div>
          )}
          {sorted.map((group, i) => (
            <div key={group.sponsor} className="cl-card" style={{ animationDelay: `${i * 30}ms` }}>
              <SponsorCard group={group} rank={i} searchQuery={activeSpace || {}} />
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: "2rem", padding: "12px 16px", background: "#faf8f4", borderRadius: 6, border: "1px solid #e5e0d8", fontSize: 11, color: "#999", fontFamily: mono, lineHeight: 1.6 }}>
            Data from <strong style={{ color: "#555" }}>ClinicalTrials.gov</strong> public API (v2). Updates when you search. Interventional studies only. Trials grouped by lead sponsor; a sponsor may have multiple trials across indications.
            <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" style={{ color: "#c8102e", marginLeft: 6, textDecoration: "none" }}>clinicaltrials.gov ↗</a>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && !error && studies.length === 0 && !showModal && (
        <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: 13, color: "#888", fontFamily: mono, marginBottom: 16 }}>No trials found for this search. Try broader terms.</div>
          <button style={S.btn()} onClick={() => setShowModal(true)}>Try a different search →</button>
        </div>
      )}
    </div>
  );
}
