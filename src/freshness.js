// How recently a status was confirmed, and how: against an official dataset when the
// page loaded, by the website check, or by hand in the team's sheet.
import { fmtDate } from "./ui";

export const STALE_DAYS = 120;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayMonth = (iso) => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${MONTHS[m - 1]}${y !== new Date().getUTCFullYear() ? ` ${y}` : ""}`; };
const age = (iso, today) => Math.round((new Date(today) - new Date(iso)) / 86400000);

// tone: "live" | "auto" | "hand" | "old" | "flag" | "none"
export function freshness(cell, today) {
  if (!cell) return { tone: "none", short: "", long: "" };
  if (cell.auto) return { tone: "auto", short: "", long: "" }; // shown as "Updated automatically"
  if (cell.confirmedBy) return { tone: "live", short: "✓ Live", long: `Confirmed against ${cell.confirmedBy} when this page loaded.` };
  const v = cell.verified;
  const hand = cell.checkedOn;
  if (v?.result === "differs") {
    return { tone: "flag", short: "⚠ Check source", long: `The website check on ${fmtDate(v.at)} found that ${v.body || "the body"}'s page may say something different${v.note ? `: ${v.note}` : ""}. Please check it and update the sheet.`, page: v.page };
  }
  const auto = v && (v.result === "agrees" || v.result === "absent") ? v.at : null;
  if (auto && (!hand || auto >= hand)) {
    return { tone: "auto", short: `✓ ${dayMonth(auto)}`, long: v.result === "absent" ? `Checked automatically on ${fmtDate(auto)}: ${v.body || "the body"}'s website lists no decision for it.` : `Confirmed automatically on ${fmtDate(auto)} against ${v.body || "the body"}'s website.`, page: v.page };
  }
  if (hand) {
    const old = age(hand, today) > STALE_DAYS;
    return { tone: old ? "old" : "hand", short: `Checked ${dayMonth(hand)}`, long: `Last checked by hand on ${fmtDate(hand)}${cell.checkedBy ? ` (${cell.checkedBy})` : ""}.${old ? " This is a while ago." : ""}` };
  }
  return { tone: "none", short: "Not checked", long: "No record of when this was last checked." };
}

export const TONE_COLOR = { live: "#166534", auto: "#166534", hand: "#6b6760", old: "#92580a", flag: "#92580a", none: "#96918a" };
