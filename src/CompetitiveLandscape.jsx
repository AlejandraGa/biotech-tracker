import { useState, useCallback } from "react";

// ─── API ─────────────────────────────────────────────────────────────────────
async function searchClinicalTrials({ condition, intervention }) {
  try {
    const params = new URLSearchParams();
    params.set("query.term", [condition, intervention].filter(Boolean).join(" "));
    params.set("pageSize", "40");
    params.set("sort", "LastUpdatePostDate:desc");
    params.set("fields", [
      "NCTId","BriefTitle","LeadSponsorName","OverallStatus","Phase",
      "StartDate","PrimaryCompletionDate","EnrollmentCount",
      "LocationCountry","LastUpdatePostDate","BriefSummary",
      "InterventionName","InterventionType",
    ].join(","));

    const url = `https://clinicaltrials.gov/api/v2/studies?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { ok: true, studies: data.studies || [] };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function extractStudy(raw) {
  try {
    const p = raw.protocolSection || {};
    const id = p.identificationModule || {};
    const sm = p.statusModule || {};
    const sp = p.sponsorCollaboratorsModule || {};
    const dm = p.designModule || {};
    const desc = p.descriptionModule || {};
    const arms = p.armsInterventionsModule || {};
    const locs = p.contactsLocationsModule || {};

    const countries = [...new Set((locs.locations||[]).map(l=>l.country).filter(Boolean))].slice(0,6);
    const interventions = (arms.interventions||[])
      .filter(i=>["DRUG","BIOLOGICAL","GENETIC","COMBINATION_PRODUCT"].includes(i.type))
      .map(i=>i.name).filter(Boolean).slice(0,3);
    const phases = dm.phases||[];
    const phase = phases.length ? phases.join("/").replace(/PHASE(\d)/g,"Phase $1").replace(/_/g," ") : "N/A";

    return {
      nctId: id.nctId||"",
      title: id.briefTitle||id.officialTitle||"Untitled",
      sponsor: sp.leadSponsor?.name||"Unknown",
      status: sm.overallStatus||"Unknown",
      phase,
      startDate: sm.startDateStruct?.date||"",
      completionDate: sm.primaryCompletionDateStruct?.date||sm.completionDateStruct?.date||"",
      enrollment: dm.enrollmentInfo?.count||null,
      countries,
      interventions,
      summary: (desc.briefSummary||"").slice(0,600),
    };
  } catch { return null; }
}

function phaseRank(phase) {
  const p = (phase||"").toUpperCase();
  if (p.includes("4")) return 7;
  if (p.includes("3")) return 6;
  if (p.includes("2") && p.includes("3")) return 5;
  if (p.includes("2")) return 4;
  if (p.includes("1") && p.includes("2")) return 3;
  if (p.includes("1")) return 2;
  if (p.includes("EARLY")) return 1;
  return 0;
}

function groupBySponsor(studies) {
  const map = {};
  for (const s of studies) {
    const key = s.sponsor.toLowerCase().replace(/[,.]?\s+(inc\.?|ltd\.?|sa|ag|plc|gmbh|corp\.?|llc\.?)$/i,"").trim();
    if (!map[key]) map[key] = { sponsor: s.sponsor, studies: [] };
    map[key].studies.push(s);
  }
  return Object.values(map)
    .map(g => ({ ...g, leadStudy: [...g.studies].sort((a,b)=>phaseRank(b.phase)-phaseRank(a.phase))[0] }))
    .sort((a,b) => phaseRank(b.leadStudy?.phase) - phaseRank(a.leadStudy?.phase));
}

// ─── STYLE HELPERS ───────────────────────────────────────────────────────────
const mono = "'DM Mono', monospace";
const serif = "'Georgia', serif";

function phasePill(phase) {
  const p = (phase||"").toUpperCase();
  if (p.includes("3")||p.includes("4")) return { bg:"rgba(29,78,216,0.09)", color:"#1d4ed8" };
  if (p.includes("2")) return { bg:"rgba(161,98,7,0.09)", color:"#a16207" };
  if (p.includes("1")) return { bg:"rgba(109,40,217,0.09)", color:"#6d28d9" };
  return { bg:"#f0ede8", color:"#888" };
}

function statusPill(status) {
  const s = (status||"").toUpperCase();
  if (s==="RECRUITING") return { color:"#15803d", label:"● Recruiting" };
  if (s==="ACTIVE_NOT_RECRUITING") return { color:"#1d4ed8", label:"◉ Active" };
  if (s==="COMPLETED") return { color:"#555", label:"✓ Completed" };
  if (s==="NOT_YET_RECRUITING") return { color:"#a16207", label:"○ Not yet" };
  if (s==="TERMINATED") return { color:"#c8102e", label:"✕ Terminated" };
  return { color:"#888", label:(status||"").replace(/_/g," ") };
}

function Spin() {
  return <span style={{ display:"inline-block", width:11, height:11, border:"1.5px solid #ddd", borderTopColor:"#c8102e", borderRadius:"50%", animation:"clspin 0.7s linear infinite", marginRight:5, verticalAlign:-1, flexShrink:0 }} />;
}

const Btn = ({ onClick, color="#1a1a1a", children, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{ background:color, border:"none", borderRadius:4, padding:"8px 15px", color:"#fff", fontSize:11, cursor:"pointer", fontWeight:700, fontFamily:mono, display:"inline-flex", alignItems:"center", gap:5, opacity:disabled?0.6:1 }}>
    {children}
  </button>
);

const GhostBtn = ({ onClick, children }) => (
  <button onClick={onClick} style={{ background:"transparent", border:"1px solid #d1ccc4", borderRadius:4, padding:"5px 10px", color:"#555", fontSize:11, cursor:"pointer", fontFamily:mono }}>
    {children}
  </button>
);

function FilterPill({ active, onClick, children, activeColor="#1a1a1a" }) {
  return (
    <button onClick={onClick} style={{ padding:"4px 11px", borderRadius:4, fontSize:11, cursor:"pointer", fontFamily:mono, fontWeight:active?700:400, border:active?`1.5px solid ${activeColor}`:"1px solid #d1ccc4", background:active?activeColor:"transparent", color:active?"#fff":"#555" }}>
      {children}
    </button>
  );
}

async function callClaude(prompt) {
  try {
    const res = await fetch("/api/claude", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ model:"claude-sonnet-4-5", max_tokens:700, messages:[{role:"user",content:prompt}] }) });
    const d = await res.json();
    return d.content?.[0]?.text || "No response.";
  } catch { return "Could not reach AI."; }
}

const QUICK = [
  { label:"Alzheimer's · amyloid", condition:"Alzheimer Disease", intervention:"amyloid" },
  { label:"Atopic Dermatitis · IL", condition:"Atopic Dermatitis", intervention:"interleukin" },
  { label:"NSCLC · PD-1", condition:"Non-Small Cell Lung Carcinoma", intervention:"PD-1" },
  { label:"Obesity · GLP-1", condition:"Obesity", intervention:"GLP-1" },
  { label:"Sickle Cell · gene therapy", condition:"Sickle Cell Disease", intervention:"gene therapy" },
  { label:"Haemophilia B", condition:"Hemophilia B", intervention:"gene therapy" },
  { label:"Breast Cancer · PI3K", condition:"Breast Cancer", intervention:"PI3K" },
  { label:"MS · BTK", condition:"Multiple Sclerosis", intervention:"BTK" },
];

// ─── DRAWER ──────────────────────────────────────────────────────────────────
function StudyDrawer({ study, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:600, display:"flex", justifyContent:"flex-end" }} onClick={onClose}>
      <div style={{ width:"min(460px,100%)", height:"100%", background:"#fefcf9", borderLeft:"1px solid #e5e0d8", overflowY:"auto", padding:22, boxShadow:"-6px 0 32px rgba(0,0,0,0.12)" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:"#c8102e", fontFamily:mono, fontWeight:700, textDecoration:"none" }}>{study.nctId} ↗</a>
            <div style={{ fontSize:14, fontWeight:700, color:"#111", fontFamily:serif, lineHeight:1.4, marginTop:4 }}>{study.title}</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, color:"#bbb", cursor:"pointer" }}>×</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          {[["Sponsor",study.sponsor],["Phase",study.phase],["Status",study.status.replace(/_/g," ")],["Enrollment",study.enrollment?`${study.enrollment.toLocaleString()} pts`:"N/A"],["Start",study.startDate||"N/A"],["Completion",study.completionDate||"N/A"]].map(([l,v])=>(
            <div key={l} style={{ background:"#f5f2ed", borderRadius:6, padding:"7px 10px" }}>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1px", marginBottom:2 }}>{l}</div>
              <div style={{ fontSize:11, color:"#1a1a1a", fontWeight:600, fontFamily:mono }}>{v}</div>
            </div>
          ))}
        </div>
        {study.interventions.length>0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>Interventions</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {study.interventions.map((x,i)=><span key={i} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:"rgba(29,78,216,0.07)", color:"#1d4ed8", border:"0.5px solid rgba(29,78,216,0.2)", fontFamily:mono, fontWeight:600 }}>{x}</span>)}
            </div>
          </div>
        )}
        {study.countries.length>0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1px", marginBottom:5 }}>Countries</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {study.countries.map((c,i)=><span key={i} style={{ fontSize:10, padding:"2px 7px", borderRadius:4, background:"#f0ede8", color:"#555", fontFamily:mono }}>{c}</span>)}
            </div>
          </div>
        )}
        {study.summary && <p style={{ fontSize:12, color:"#444", lineHeight:1.7, fontFamily:serif, marginBottom:16 }}>{study.summary}</p>}
        <a href={`https://clinicaltrials.gov/study/${study.nctId}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:"#c8102e", fontFamily:mono, fontWeight:700, textDecoration:"none" }}>View on ClinicalTrials.gov ↗</a>
      </div>
    </div>
  );
}

// ─── SPONSOR CARD ────────────────────────────────────────────────────────────
function SponsorCard({ group, rank, spaceLabel }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(null);
  const [aiText, setAiText] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const lead = group.leadStudy;
  const others = group.studies.filter(s=>s.nctId!==lead.nctId);
  const ph = phasePill(lead.phase);
  const st = statusPill(lead.status);
  const COLORS = ["#c8102e","#1d4ed8","#7c3aed","#065f46","#a16207","#0369a1","#9a3412","#4338ca"];
  const rc = COLORS[rank%COLORS.length];

  const getIntel = async (e) => {
    e.stopPropagation();
    setOpen(true);
    if (aiText) return;
    setLoadingAI(true);
    const lines = group.studies.slice(0,3).map(s=>`• ${s.phase} | ${s.status.replace(/_/g," ")} | ${s.countries.slice(0,3).join(", ")||"N/A"} | ${s.title.slice(0,65)}`).join("\n");
    const t = await callClaude(`You are a market access strategist at a small pharma in: ${spaceLabel}.\nCompetitor: ${group.sponsor} — ${group.studies.length} trial(s):\n${lines}\n\nRespond in exactly 3 bullet points (use • as bullet, max 2 sentences each):\n• Development threat: their phase/timeline vs a late entrant\n• Geographic strategy: what their country list signals about HTA priorities\n• Your move: one specific differentiator or counter-strategy`);
    setAiText(t);
    setLoadingAI(false);
  };

  return (
    <>
      {drawer && <StudyDrawer study={drawer} onClose={()=>setDrawer(null)} />}
      <div style={{ background:"#fff", border:"1px solid #e5e0d8", borderRadius:8, marginBottom:8, overflow:"hidden" }}>
        <div style={{ padding:"12px 16px", cursor:"pointer", borderBottom:open?"1px solid #f0ede8":"none" }} onClick={()=>setOpen(x=>!x)}>
          <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
            <div style={{ width:28, height:28, borderRadius:5, background:`${rc}18`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:800, color:rc, fontFamily:mono }}>#{rank+1}</span>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:4 }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#111", fontFamily:serif }}>{group.sponsor}</span>
                {group.studies.length>1 && <span style={{ fontSize:10, color:"#888", fontFamily:mono, background:"#f5f2ed", padding:"1px 7px", borderRadius:10 }}>{group.studies.length} trials</span>}
              </div>
              <div style={{ fontSize:12, color:"#666", fontFamily:serif, lineHeight:1.4, marginBottom:6 }}>{lead.title.slice(0,95)}{lead.title.length>95?"…":""}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                <span style={{ fontSize:10, padding:"2px 9px", borderRadius:10, background:ph.bg, color:ph.color, fontWeight:700, fontFamily:mono }}>{lead.phase}</span>
                <span style={{ fontSize:10, color:st.color, fontFamily:mono, fontWeight:600 }}>{st.label}</span>
                {lead.countries.slice(0,4).map(c=><span key={c} style={{ fontSize:10, padding:"1px 6px", borderRadius:4, background:"#f0ede8", color:"#555", fontFamily:mono }}>{c}</span>)}
                {lead.countries.length>4 && <span style={{ fontSize:10, color:"#aaa", fontFamily:mono }}>+{lead.countries.length-4}</span>}
                {lead.enrollment && <span style={{ fontSize:10, color:"#aaa", fontFamily:mono }}>· {lead.enrollment.toLocaleString()} pts</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
              <Btn onClick={getIntel} color="#065f46">{loadingAI?<><Spin/>…</>:aiText?"Intel ✓":"Intel →"}</Btn>
              <span style={{ fontSize:16, color:"#ccc", transform:open?"rotate(180deg)":"none", transition:"transform 0.2s", display:"inline-block" }}>⌄</span>
            </div>
          </div>
        </div>

        {open && (
          <div style={{ background:"#fdfcfa" }}>
            <div style={{ padding:"12px 16px", borderBottom:(others.length>0||loadingAI||aiText)?"1px solid #f0ede8":"none" }}>
              <div style={{ fontSize:9, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"#c8102e", fontFamily:mono, marginBottom:8 }}>Lead trial</div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:8 }}>
                {[["NCT",lead.nctId],["Enrollment",lead.enrollment?`${lead.enrollment.toLocaleString()} pts`:"N/A"],["Completion",lead.completionDate||"N/A"]].map(([l,v])=>(
                  <div key={l} style={{ background:"#f5f2ed", borderRadius:5, padding:"6px 10px" }}>
                    <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1px", marginBottom:1 }}>{l}</div>
                    <div style={{ fontSize:11, color:"#333", fontWeight:600, fontFamily:mono }}>{v}</div>
                  </div>
                ))}
              </div>
              {lead.interventions.length>0 && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:8 }}>
                  {lead.interventions.map((x,i)=><span key={i} style={{ fontSize:10, padding:"2px 8px", borderRadius:4, background:"rgba(29,78,216,0.07)", color:"#1d4ed8", border:"0.5px solid rgba(29,78,216,0.2)", fontFamily:mono, fontWeight:600 }}>{x}</span>)}
                </div>
              )}
              <GhostBtn onClick={()=>setDrawer(lead)}>View full details →</GhostBtn>
            </div>

            {others.length>0 && (
              <div style={{ padding:"10px 16px", borderBottom:(loadingAI||aiText)?"1px solid #f0ede8":"none" }}>
                <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:6 }}>Other trials ({others.length})</div>
                {others.map(s=>{
                  const sph=phasePill(s.phase); const sst=statusPill(s.status);
                  return (
                    <div key={s.nctId} onClick={()=>setDrawer(s)} style={{ display:"flex", alignItems:"center", gap:8, padding:"7px 0", borderBottom:"1px solid #f5f2ed", cursor:"pointer" }}>
                      <span style={{ fontSize:9, padding:"1px 7px", borderRadius:8, background:sph.bg, color:sph.color, fontFamily:mono, fontWeight:700, flexShrink:0 }}>{s.phase}</span>
                      <span style={{ fontSize:11, color:"#333", flex:1, fontFamily:serif, lineHeight:1.3 }}>{s.title.slice(0,80)}{s.title.length>80?"…":""}</span>
                      <span style={{ fontSize:10, color:sst.color, fontFamily:mono, fontWeight:600, flexShrink:0 }}>{sst.label}</span>
                      <span style={{ fontSize:11, color:"#c8102e", fontFamily:mono }}>→</span>
                    </div>
                  );
                })}
              </div>
            )}

            {(loadingAI||aiText) && (
              <div style={{ padding:"12px 16px" }}>
                {loadingAI && <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#888", fontFamily:mono }}><Spin/>Generating competitive intel…</div>}
                {aiText && <div style={{ background:"#faf8f4", borderRadius:6, padding:"12px 14px", fontSize:13, color:"#333", lineHeight:1.75, border:"1px solid #e5e0d8", fontFamily:serif, borderLeft:"3px solid #065f46", whiteSpace:"pre-line" }}><div style={{ fontSize:9, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"#065f46", fontFamily:mono, marginBottom:8 }}>AI · Competitive Intel</div>{aiText}</div>}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function CompetitiveLandscape() {
  const [condition, setCondition] = useState("");
  const [intervention, setIntervention] = useState("");
  const [saved, setSaved] = useState([]);
  const [activeSpace, setActiveSpace] = useState(null);
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("ALL");
  const [searchText, setSearchText] = useState("");
  const [sortBy, setSortBy] = useState("phase");
  const [aiOverview, setAiOverview] = useState("");
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [formErr, setFormErr] = useState("");

  const doSearch = useCallback(async (cond, inter) => {
    if (!cond.trim()) { setFormErr("Please enter a disease / condition."); return; }
    setFormErr(""); setError(""); setStudies([]); setAiOverview(""); setPhaseFilter("ALL"); setSearchText("");
    const space = { condition: cond.trim(), intervention: (inter||"").trim() };
    setActiveSpace(space);
    setSaved(prev => prev.find(s=>s.condition===space.condition&&s.intervention===space.intervention) ? prev : [space,...prev].slice(0,6));
    setLoading(true);
    const result = await searchClinicalTrials(space);
    setLoading(false);
    if (!result.ok) {
      setError(`ClinicalTrials.gov request failed (${result.error}). This is likely a CORS issue — you need a server-side proxy at /api/clinicaltrials that forwards requests to https://clinicaltrials.gov/api/v2/studies and passes query params through.`);
      return;
    }
    const extracted = result.studies.map(extractStudy).filter(Boolean);
    if (extracted.length===0) { setError("No trials found. Try broader terms or remove the intervention filter."); return; }
    setStudies(extracted);
  }, []);

  const applyQuick = (q) => { setCondition(q.condition); setIntervention(q.intervention||""); };

  const filtered = studies.filter(s => {
    if (phaseFilter!=="ALL") {
      const p=(s.phase||"").toUpperCase();
      if (phaseFilter==="PHASE3"&&!p.includes("3")&&!p.includes("4")) return false;
      if (phaseFilter==="PHASE2"&&!p.includes("2")) return false;
      if (phaseFilter==="PHASE1"&&!p.includes("1")&&!p.includes("EARLY")) return false;
    }
    if (searchText) {
      const hay=(s.sponsor+" "+s.title+" "+s.interventions.join(" ")+" "+s.countries.join(" ")).toLowerCase();
      if (!hay.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  const grouped = groupBySponsor(filtered);
  const sorted = sortBy==="sponsor" ? [...grouped].sort((a,b)=>a.sponsor.localeCompare(b.sponsor))
    : sortBy==="trials" ? [...grouped].sort((a,b)=>b.studies.length-a.studies.length)
    : grouped;

  const handleOverview = async () => {
    if (aiOverview||!activeSpace) return;
    setLoadingOverview(true);
    const top = sorted.slice(0,6).map(g=>`${g.sponsor}: ${g.leadStudy.phase}, ${g.studies.length} trial(s), ${g.leadStudy.countries.slice(0,3).join(", ")||"N/A"}`).join("\n");
    const t = await callClaude(`You are a market access director at a small pharma.\nSpace: ${activeSpace.condition}${activeSpace.intervention?" / "+activeSpace.intervention:""}\nTop competitors:\n${top}\nTotal: ${sorted.length} sponsors, ${filtered.length} trials\n\nWrite a 3-paragraph strategic briefing:\n1. Competitive intensity and development stage of the space\n2. Geographic patterns and what they signal for HTA/reimbursement strategy\n3. One concrete recommendation for a small/mid pharma entering this space\nNo hedging. Be direct and commercial.`);
    setAiOverview(t);
    setLoadingOverview(false);
  };

  const spaceLabel = activeSpace ? `${activeSpace.condition}${activeSpace.intervention?" · "+activeSpace.intervention:""}` : "";
  const p3 = filtered.filter(s=>{const p=s.phase.toUpperCase();return p.includes("3")||p.includes("4");}).length;
  const p2 = filtered.filter(s=>{const p=s.phase.toUpperCase();return p.includes("2")&&!p.includes("3");}).length;
  const p1 = filtered.filter(s=>{const p=s.phase.toUpperCase();return (p.includes("1")||p.includes("EARLY"))&&!p.includes("2");}).length;

  return (
    <div>
      <style>{`@keyframes clspin{to{transform:rotate(360deg)}}`}</style>

      {/* Section header */}
      <div style={{ borderTop:"3px solid #1a1a1a", borderBottom:"1px solid #1a1a1a", padding:"0.5rem 0", marginBottom:"1.25rem", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:6 }}>
        <span style={{ fontSize:10, color:"#555", letterSpacing:"0.5px", textTransform:"uppercase", fontFamily:mono }}>Competitive Landscape · Live Data</span>
        <span style={{ fontSize:10, color:"#065f46", fontFamily:mono, fontWeight:700 }}>ClinicalTrials.gov · v2 API</span>
      </div>

      {/* ── SEARCH FORM (always visible) ── */}
      <div style={{ background:"#fff", border:"1px solid #e5e0d8", borderRadius:10, overflow:"hidden", marginBottom:"1.5rem" }}>
        <div style={{ padding:"18px 22px 14px", borderBottom:"1px solid #f0ede8" }}>
          <div style={{ fontSize:9, fontWeight:700, letterSpacing:"2.5px", textTransform:"uppercase", color:"#c8102e", fontFamily:mono, marginBottom:6 }}>Configure search</div>
          <div style={{ fontSize:17, fontWeight:700, color:"#111", fontFamily:serif, marginBottom:4 }}>Define your competitive space</div>
          <div style={{ fontSize:12, color:"#777", fontFamily:serif, lineHeight:1.6 }}>Live data from ClinicalTrials.gov · No API key · No login</div>
        </div>
        <div style={{ padding:"18px 22px" }}>
          {/* Quick starts */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:7 }}>Quick start</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {QUICK.map(q=>(
                <button key={q.label} onClick={()=>applyQuick(q)} style={{ padding:"4px 12px", borderRadius:20, fontSize:11, cursor:"pointer", fontFamily:mono, border: condition===q.condition&&intervention===q.intervention?"1.5px solid #1a1a1a":"1px solid #d1ccc4", background:condition===q.condition&&intervention===q.intervention?"#1a1a1a":"transparent", color:condition===q.condition&&intervention===q.intervention?"#fff":"#444", fontWeight:condition===q.condition&&intervention===q.intervention?700:400 }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>
          {/* Inputs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:5 }}>Disease / Condition <span style={{ color:"#c8102e" }}>*</span></div>
              <input style={{ width:"100%", background:"#faf8f4", border:"1px solid #d1ccc4", borderRadius:6, padding:"9px 12px", fontSize:12, fontFamily:serif, outline:"none", boxSizing:"border-box" }}
                value={condition} onChange={e=>{setCondition(e.target.value);setFormErr("");}}
                onKeyDown={e=>e.key==="Enter"&&doSearch(condition,intervention)}
                placeholder="e.g. Atopic Dermatitis, Hemophilia B…" />
            </div>
            <div>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:5 }}>Target / MoA / Intervention <span style={{ color:"#bbb", fontWeight:400 }}>(optional)</span></div>
              <input style={{ width:"100%", background:"#faf8f4", border:"1px solid #d1ccc4", borderRadius:6, padding:"9px 12px", fontSize:12, fontFamily:serif, outline:"none", boxSizing:"border-box" }}
                value={intervention} onChange={e=>setIntervention(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&doSearch(condition,intervention)}
                placeholder="e.g. interleukin, gene therapy, PD-1…" />
            </div>
          </div>
          {/* Saved */}
          {saved.length>0 && (
            <div style={{ marginBottom:14, padding:"10px 12px", background:"#f5f2ed", borderRadius:6 }}>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:6 }}>Recent searches</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {saved.map((sp,i)=>(
                  <button key={i} onClick={()=>{setCondition(sp.condition);setIntervention(sp.intervention);doSearch(sp.condition,sp.intervention);}}
                    style={{ padding:"3px 11px", borderRadius:20, fontSize:10, cursor:"pointer", fontFamily:mono, border:"1px solid #d1ccc4", background:"#fff", color:"#333" }}>
                    {sp.condition}{sp.intervention?" · "+sp.intervention:""} ↩
                  </button>
                ))}
              </div>
            </div>
          )}
          {formErr && <div style={{ fontSize:11, color:"#c8102e", fontFamily:mono, marginBottom:10 }}>— {formErr}</div>}
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <Btn onClick={()=>doSearch(condition,intervention)} disabled={loading}>
              {loading?<><Spin/>Searching…</>:"Search landscape →"}
            </Btn>
            <span style={{ fontSize:10, color:"#bbb", fontFamily:mono }}>ClinicalTrials.gov · public API · no login needed</span>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign:"center", padding:"3rem" }}>
          <span style={{ width:36, height:36, border:"2.5px solid #e5e0d8", borderTopColor:"#c8102e", borderRadius:"50%", animation:"clspin 0.8s linear infinite", display:"inline-block", marginBottom:12 }} />
          <div style={{ fontSize:12, color:"#888", fontFamily:mono }}>Querying ClinicalTrials.gov for "{activeSpace?.condition}"…</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding:"16px 20px", background:"rgba(200,16,46,0.04)", border:"1px solid rgba(200,16,46,0.2)", borderRadius:8, marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#c8102e", fontFamily:mono, marginBottom:6 }}>
            {error.includes("CORS") ? "⚠ CORS restriction — needs a server-side proxy" : "⚠ No results found"}
          </div>
          <div style={{ fontSize:12, color:"#555", fontFamily:serif, lineHeight:1.65 }}>{error}</div>
          {error.includes("proxy") && (
            <div style={{ marginTop:10, padding:"10px 14px", background:"#f5f2ed", borderRadius:6, fontSize:11, color:"#444", fontFamily:mono, lineHeight:1.8 }}>
              <strong>Add this file to your Vercel project:</strong><br/>
              <code style={{ background:"#e5e0d8", padding:"2px 6px", borderRadius:3, fontSize:10 }}>
                /api/clinicaltrials.js
              </code><br/>
              Content: forward <code style={{ background:"#e5e0d8", padding:"1px 5px", borderRadius:3, fontSize:10 }}>req.query</code> to{" "}
              <code style={{ background:"#e5e0d8", padding:"1px 5px", borderRadius:3, fontSize:10 }}>https://clinicaltrials.gov/api/v2/studies</code> and return the JSON.
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!loading && studies.length>0 && (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:"1rem", flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#1d4ed8", fontFamily:serif }}>{spaceLabel}</span>
            <span style={{ fontSize:10, color:"#aaa", fontFamily:mono }}>· {studies.length} trials · {sorted.length} sponsors</span>
          </div>

          {/* Metrics */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))", gap:10, marginBottom:"1.25rem" }}>
            {[{l:"Sponsors",v:sorted.length,c:"#1a1a1a"},{l:"Phase 3+",v:p3,c:"#1d4ed8"},{l:"Phase 2",v:p2,c:"#a16207"},{l:"Phase 1",v:p1,c:"#6d28d9"},{l:"Total trials",v:filtered.length,c:"#555"}].map(m=>(
              <div key={m.l} style={{ background:"#fff", borderRadius:8, padding:"10px 14px", border:"1px solid #e5e0d8" }}>
                <div style={{ fontSize:9, color:"#aaa", textTransform:"uppercase", letterSpacing:"0.5px", fontFamily:mono, marginBottom:3 }}>{m.l}</div>
                <div style={{ fontSize:22, fontWeight:700, color:m.c, fontFamily:mono }}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* AI overview */}
          <div style={{ marginBottom:"1.25rem" }}>
            <Btn onClick={handleOverview} color="#065f46">
              {loadingOverview?<><Spin/>Analyzing…</>:aiOverview?"Strategic Briefing ✓":"→ Generate strategic briefing"}
            </Btn>
            {aiOverview && (
              <div style={{ background:"#faf8f4", borderRadius:6, padding:"14px 16px", fontSize:13, color:"#333", lineHeight:1.75, border:"1px solid #e5e0d8", fontFamily:serif, borderLeft:"3px solid #065f46", marginTop:12 }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:"2px", textTransform:"uppercase", color:"#065f46", fontFamily:mono, marginBottom:10 }}>AI · Strategic Briefing · {spaceLabel}</div>
                {aiOverview}
              </div>
            )}
          </div>

          {/* Filters */}
          <div style={{ background:"#fff", border:"1px solid #e5e0d8", borderRadius:8, padding:"12px 16px", marginBottom:"1.25rem", display:"flex", gap:16, flexWrap:"wrap", alignItems:"flex-end" }}>
            <div>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:5 }}>Phase</div>
              <div style={{ display:"flex", gap:5 }}>
                {[{k:"ALL",l:"All"},{k:"PHASE3",l:"Ph 3+"},{k:"PHASE2",l:"Ph 2"},{k:"PHASE1",l:"Ph 1"}].map(o=>(
                  <FilterPill key={o.k} active={phaseFilter===o.k} onClick={()=>setPhaseFilter(o.k)}>{o.l}</FilterPill>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:5 }}>Sort</div>
              <div style={{ display:"flex", gap:5 }}>
                {[{k:"phase",l:"Phase"},{k:"trials",l:"# Trials"},{k:"sponsor",l:"A–Z"}].map(o=>(
                  <FilterPill key={o.k} active={sortBy===o.k} onClick={()=>setSortBy(o.k)} activeColor="#1d4ed8">{o.l}</FilterPill>
                ))}
              </div>
            </div>
            <div style={{ flex:1, minWidth:180 }}>
              <div style={{ fontSize:9, color:"#aaa", fontFamily:mono, textTransform:"uppercase", letterSpacing:"1.5px", marginBottom:5 }}>Filter</div>
              <div style={{ display:"flex", gap:6 }}>
                <input style={{ flex:1, background:"#faf8f4", border:"1px solid #d1ccc4", borderRadius:5, padding:"6px 10px", fontSize:12, fontFamily:mono, outline:"none" }}
                  value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="sponsor, drug, country…" />
                {searchText && <GhostBtn onClick={()=>setSearchText("")}>×</GhostBtn>}
              </div>
            </div>
          </div>

          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"2.5px", textTransform:"uppercase", color:"#c8102e", fontFamily:mono, borderBottom:"1px solid #e5e0d8", paddingBottom:4, marginBottom:12 }}>
            {sorted.length} sponsors · ranked by highest trial phase
          </div>

          {sorted.length===0
            ? <div style={{ textAlign:"center", padding:"2rem", color:"#888", fontSize:13, fontFamily:mono }}>No results match your filters.</div>
            : sorted.map((g,i)=><SponsorCard key={g.sponsor+i} group={g} rank={i} spaceLabel={spaceLabel} />)
          }

          <div style={{ marginTop:"2rem", padding:"10px 14px", background:"#faf8f4", borderRadius:6, border:"1px solid #e5e0d8", fontSize:10, color:"#999", fontFamily:mono, lineHeight:1.7 }}>
            Data: <strong style={{ color:"#555" }}>ClinicalTrials.gov</strong> public API v2 · Interventional studies · Live on search ·{" "}
            <a href="https://clinicaltrials.gov" target="_blank" rel="noopener noreferrer" style={{ color:"#c8102e", textDecoration:"none" }}>clinicaltrials.gov ↗</a>
          </div>
        </>
      )}
    </div>
  );
}
