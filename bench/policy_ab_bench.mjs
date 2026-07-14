// 전략 프롬프트 5단계 × a3b 벤치 — 프롬프트가 성과에 영향 주는가
import { chromium } from "/Users/bueong-i/songpick/node_modules/playwright/index.mjs";
const BIN = "/Users/bueong-i/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell";
const MODEL = "qwen3.6:27b", HOST = "100.99.3.8";
const SEEDS = [4271, 2222];
const LEVELS = [
  { lv: "L1-none", orders: "" }, // 유저 무입력 → 게임 기본 문구
  { lv: "L5-expert", orders: "Milk-run: repeat the shortest 2-port loop with the best spread. Buy only below 0.9x average, sell above 1.15x. Split buys into lots of 10-15 to limit price impact. Haggle always, accept mid. Sail at once, never idle. Rest at fatigue 70. Ignore the west before 6,000. Target 10,000." },
];
const CAP_MIN = 60;
const results = [];
for (const seed of SEEDS) {
  for (const L of LEVELS) {
    const tag = L.lv + "/s" + seed;
    console.log(new Date().toISOString(), "=== START", tag);
    const b = await chromium.launch({ executablePath: BIN });
    const p = await b.newPage();
    p.on("pageerror", e => console.log("PAGEERR", tag, String(e).slice(0, 120)));
    await p.addInitScript(h => { window.__ollamaApproved = "http://" + h + ":11434"; }, HOST);
    await p.goto("file:///Users/bueong-i/teamwork/merchant-arena/voyage2.html?ollama=" + HOST);
    await p.waitForTimeout(5000);
    const brain = await p.evaluate(cfg => {
      seededRng = mulberry32(cfg.seed);
      LLM_CFG.enabled = true; LLM_CFG.model = cfg.model; LLM_CFG.provider = "ollama";
      if (!LLM_CFG.ep) LLM_CFG.ep = "http://" + cfg.host + ":11434/api/generate";
      window.__pendingOrders = cfg.orders;
      return { ep: LLM_CFG.ep, en: LLM_CFG.enabled };
    }, { seed, model: MODEL, orders: L.orders, host: HOST });
    if (!brain.ep || brain.ep === "x") { console.log("SKIP no endpoint", tag); await b.close(); continue; }
    await p.click('[data-mode="auto"]');
    await p.evaluate(cfg => {
      LLM_CFG.enabled = true; LLM_CFG.model = cfg.model;
      const el = document.querySelector("#ngOrders"); if (el) el.value = cfg.orders;
      window.__pendingOrders = cfg.orders;
    }, { seed, model: MODEL, orders: L.orders });
    await p.click("#ngGo");
    const chk = await p.evaluate(() => ({ ord: (G.ownerOrders || "").slice(0, 40), chat0: captains[0].chat[0].text.slice(0, 40) }));
    console.log("orders=", tag, JSON.stringify(chk));
    const t0 = Date.now();
    let last = null;
    while (Date.now() - t0 < CAP_MIN * 60000) {
      await p.waitForTimeout(60000);
      last = await p.evaluate(() => ({ day: G.day, funds: Math.round(G.funds), over: G.over, val: myCompanyValue(), pol: G.policy?{loop:G.policy.loop,bb:G.policy.buyBelow,sa:G.policy.sellAbove,lot:G.policy.lotSize}:null }));
      if (last.over) break;
    }
    const row = { seed, lv: L.lv, ...last, minutes: Math.round((Date.now() - t0) / 60000) };
    results.push(row);
    console.log("RES1", JSON.stringify(row));
    await b.close();
  }
}
console.log("RESULT", JSON.stringify(results, null, 1));
