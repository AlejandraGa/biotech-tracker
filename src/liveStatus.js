// Keeps the curated status table current using the FDA and EMA datasets that
// the monitoring service reads. Where the official dataset and the curated
// entry agree, the cell is marked as confirmed. Where they differ, the official
// value is shown and flagged, and the curated value is kept for reference.
// Swissmedic publishes no comparable dataset, so that column stays curated.

// How each tracked asset is found in the datasets.
// ema.names: medicine names. ema.all: substances that must all be present
// (used to catch a product before its EU brand name is known).
export const LIVE_MATCH = {
  biktarvy: { fda: ["BIKTARVY"], ema: { names: ["Biktarvy"] } },
  bixlenvo: { fda: ["BIXLENVO"], ema: { names: ["Bixlenvo"], all: ["bictegravir", "lenacapavir"] } },
  "isl-len": { ema: { all: ["islatravir", "lenacapavir"] } },
  sunlenca: { fda: ["SUNLENCA"], ema: { names: ["Sunlenca"] } },
  dovato: { fda: ["DOVATO"], ema: { names: ["Dovato"] } },
  "cab-rpv": { fda: ["CABENUVA", "CABENUVA KIT"], ema: { names: ["Vocabria"] } },
  idvynso: { fda: ["IDVYNSO"], ema: { names: ["Idvynso"], all: ["doravirine", "islatravir"] } },
  yeztugo: { fda: ["YEZTUGO"], ema: { names: ["Yeytuo"] } },
  apretude: { fda: ["APRETUDE"], ema: { names: ["Apretude"] } },
};

function findEma(rows, m) {
  if (!rows || !m) return null;
  const byName = rows.find((r) => (m.names || []).some((n) => r.name.toLowerCase() === n.toLowerCase()));
  if (byName) return byName;
  if (m.all) return rows.find((r) => m.all.every((s) => r.substances.includes(s))) || null;
  return null;
}
function findFda(rows, brands) {
  if (!rows || !brands) return null;
  const hits = rows.filter((r) => brands.includes(r.brand));
  // Several applications can share a brand: the earliest approval is the first one.
  return hits.sort((a, b) => a.approvalDate.localeCompare(b.approvalDate))[0] || null;
}

function opinionSense(ema) {
  if (/negative/i.test(ema.opinionStatus) || ema.refusalDate) return "negative";
  if (/positive/i.test(ema.opinionStatus) || ema.maDate) return "positive";
  return null;
}

// Returns the cell to display, given the curated cell and what the dataset says.
function reconcile(curated, official, datasetLabel) {
  if (!official) return curated;
  const same = curated?.s === official.s && (curated?.date === official.date || curated?.dateUnverified);
  if (same) return { ...curated, date: curated.date || official.date, confirmedBy: datasetLabel };
  const note = curated?.s === official.s ? curated.note : official.note;
  return { ...official, note, auto: datasetLabel, was: curated && curated.s !== "none" && curated.s !== "pending" ? curated : null };
}

const AGENCY_OF = { fda: "FDA", chmp: "CHMP", ec: "EC" };

export function applyLive(products, live) {
  if (!live || (!live.fda && !live.ema)) return { products, checked: 0, confirmed: 0, updated: 0 };
  let confirmed = 0, updated = 0, checked = 0;

  const out = products.map((p) => {
    const m = LIVE_MATCH[p.id];
    if (!m) return p;
    const reg = { ...p.reg };
    const events = [...p.events];

    const fda = findFda(live.fda, m.fda);
    const ema = findEma(live.ema, m.ema);
    const official = {
      fda: fda ? { s: "approved", date: fda.approvalDate, src: fda.url } : null,
      // The dataset leaves the opinion's direction blank once a medicine is authorised,
      // so an authorisation counts as a positive opinion and a refusal as a negative one.
      chmp: ema && ema.opinionDate && opinionSense(ema)
        ? { s: opinionSense(ema), date: ema.opinionDate, src: ema.url } : null,
      ec: ema && ema.maDate ? { s: "approved", date: ema.maDate, src: ema.url }
        : ema && ema.refusalDate ? { s: "negative", date: ema.refusalDate, note: "Marketing authorisation refused", src: ema.url } : null,
    };

    for (const key of ["fda", "chmp", "ec"]) {
      if (!official[key]) continue;
      checked++;
      const label = key === "fda" ? "FDA Drugs@FDA data" : "the EMA medicines dataset";
      const cell = reconcile(p.reg[key], official[key], label);
      reg[key] = cell;
      if (cell.auto) {
        updated++;
        // Add the decision to the history unless it is already recorded.
        if (!events.some((e) => e.agency === AGENCY_OF[key] && e.date === cell.date)) {
          events.push({ date: cell.date, agency: AGENCY_OF[key], outcome: cell.s, text: `Recorded in ${label}; picked up automatically.`, src: cell.src, auto: true });
        }
      } else if (cell.confirmedBy) confirmed++;
    }
    // After a positive CHMP opinion the next step is the Commission's decision.
    if (reg.chmp?.auto && reg.chmp.s === "positive" && !official.ec && ["pending", "none"].includes(reg.ec?.s || "none")) {
      reg.ec = { s: "pending", note: "Awaiting Commission decision" };
    }
    return { ...p, reg, events };
  });

  return { products: out, checked, confirmed, updated };
}
