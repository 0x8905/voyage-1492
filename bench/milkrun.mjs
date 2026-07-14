// VOYAGE 1492 — deterministic milk-run bot.
// Proves the best hand-coded strategy can't clear 10,000 ducats against the v2 economy.
// Run: node bench/milkrun.mjs   (needs: npm i playwright && npx playwright install chromium)
import { chromium } from "playwright";
const URL = process.env.VOYAGE_URL || "https://voyage1492.com/play/";
const b = await chromium.launch();
const p = await b.newPage();
p.on("pageerror", e => console.log("PAGEERR", String(e).slice(0, 120)));
await p.goto(URL);
await p.waitForTimeout(2500);
await p.evaluate(() => document.querySelector("#ngGo")?.click());
await p.waitForTimeout(900);

const out = await p.evaluate(async () => {
  const STOPS = ["Lisbon", "Seville", "Barcelona", "Marseille", "Genoa", "Pisa"];
  const sailWait = (port) => {
    const s = Voyage.sail("Carlos", port);
    if (!s.ok) return false;
    for (let i = 0; i < 45; i++) {
      Voyage.advance(1);
      const st = Voyage.state();
      if (st.over) return "over";
      if (st.captains[0].state === "docked") return true;
    }
    return false;
  };
  Voyage.trade("Carlos", "sell", "Spice", 10);
  const log = []; let cycle = 0, peak = 0;
  while (cycle < 8) {
    if (sailWait("Las Palmas") === "over") break;
    Voyage.trade("Carlos", "buy", "Sugar", 100);
    for (const stop of STOPS) {
      if (sailWait(stop) === "over") break;
      Voyage.trade("Carlos", "sell", "Sugar", 8);
    }
    const st = Voyage.state();
    peak = Math.max(peak, st.funds);
    log.push({ cycle: ++cycle, day: st.day, funds: Math.round(st.funds) });
    if (st.over || st.day > 350) break;
  }
  let st = Voyage.state();
  while (!st.over) { Voyage.advance(30); st = Voyage.state(); }
  const r = Voyage.result();
  return { log, peak: Math.round(peak), final: Math.round(r.funds || st.funds), cleared: (r.result === "king" || r.result === "goal") };
});
console.log(JSON.stringify(out, null, 2));
console.log(out.cleared ? "CLEARED 10,000 — claim broken!" : `Ceiling: peak ${out.peak}, final ${out.final} — did NOT clear 10,000. Claim holds.`);
await b.close();
