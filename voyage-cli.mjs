#!/usr/bin/env node
// VOYAGE 1492 — official CLI runner for agents.
// Drives the live game through window.Voyage using a persistent headless browser.
// State survives between commands via the browser profile (the game auto-saves).
//
//   npm i playwright && npx playwright install chromium
//   node voyage-cli.mjs new --era discovery --orders "rotate 3 regions"
//   node voyage-cli.mjs state
//   node voyage-cli.mjs sail Carlos Seville
//   node voyage-cli.mjs trade Carlos sell Spice 10
//   node voyage-cli.mjs advance 10
//   node voyage-cli.mjs result
//
// Env: VOYAGE_URL (default https://voyage1492.com/play/), VOYAGE_PROFILE (default ./.voyage-profile)

import { chromium } from "playwright";
import path from "node:path";
import process from "node:process";

const URL = process.env.VOYAGE_URL || "https://voyage1492.com/play/";
const PROFILE = process.env.VOYAGE_PROFILE || path.resolve(".voyage-profile");
const [, , cmd, ...rest] = process.argv;

function flag(name, def) {
  const i = rest.indexOf("--" + name);
  return i >= 0 && rest[i + 1] ? rest[i + 1] : def;
}

async function withGame(fn) {
  const opts = { headless: true };
  if (process.env.VOYAGE_CHROME) opts.executablePath = process.env.VOYAGE_CHROME;
  const ctx = await chromium.launchPersistentContext(PROFILE, opts);
  const p = ctx.pages()[0] || (await ctx.newPage());
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e).slice(0, 120)));
  await p.goto(URL, { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => typeof window.Voyage === "object", null, { timeout: 20000 });
  await p.waitForTimeout(400);
  // auto-resume an existing season if a save is present; otherwise leave the New Voyage dialog for `new`
  await p.evaluate(() => { try { if (typeof hasSave === "function" && hasSave() && typeof loadGame === "function") { loadGame(); document.querySelectorAll(".scene-back").forEach((el) => el.remove()); } } catch (e) {} });
  const out = await fn(p);
  // persist after every command (some Voyage.* paths don't auto-save)
  await p.evaluate(() => { try { if (typeof saveGame === "function") saveGame(); } catch (e) {} });
  await ctx.close();
  if (errs.length) process.stderr.write("page errors: " + JSON.stringify(errs) + "\n");
  return out;
}

function print(o) { process.stdout.write(JSON.stringify(o, null, 2) + "\n"); }

const commands = {
  async new(p) {
    const era = flag("era", "discovery");
    const orders = flag("orders", "");
    const home = flag("home", "");
    const auto = rest.includes("--auto");
    return p.evaluate(({ era, orders, home, auto }) => {
      try { wipeSave(); } catch (e) {}
      const E = ERAS_CFG.find((e) => e.id === era) || ERAS_CFG[0];
      const H = (typeof HOMES_CFG !== "undefined" && HOMES_CFG.find((h) => h.port === home || (h.en && h.en === home))) || (typeof HOMES_CFG !== "undefined" ? HOMES_CFG[0] : { port: "리스본" });
      window.__pendingOrders = orders || "";
      document.querySelectorAll(".scene-back").forEach((el) => el.remove());
      applyNewGame(E, H, "", auto && LLM_CFG.enabled);
      if (orders) Voyage.orders(orders);
      return Voyage.state();
    }, { era, orders, home, auto });
  },
  async state(p) { return p.evaluate(() => Voyage.state()); },
  async route(p) { const [from, to] = rest; return p.evaluate(([f, t]) => Voyage.route(f, t), [from, to]); },
  async sail(p) { const [cap, port] = rest; return p.evaluate(([c, po]) => Voyage.sail(c, po), [cap, port]); },
  async trade(p) { const [cap, side, good, qty] = rest; return p.evaluate(([c, s, g, q]) => Voyage.trade(c, s, g, +q), [cap, side, good, qty]); },
  async escorts(p) { const [cap, n] = rest; return p.evaluate(([c, x]) => Voyage.escorts(c, +x), [cap, n]); },
  async advance(p) { const days = +(rest[0] || 1); return p.evaluate((d) => Voyage.advance(d), days); },
  async identify(p) { return p.evaluate((n) => Voyage.identify(n), rest[0] || ""); },
  async result(p) { return p.evaluate(() => Voyage.result()); },
  async id(p) { return p.evaluate(() => ({ id: Voyage.id() })); },
};

if (!cmd || !commands[cmd]) {
  process.stderr.write("VOYAGE 1492 CLI\nCommands: new | state | route <from> <to> | sail <captain> <port> | trade <captain> buy|sell <good> <qty> | escorts <captain> 0-3 | advance <days> | identify <name> | result | id\n");
  process.exit(cmd ? 1 : 0);
}

withGame(commands[cmd]).then(print).catch((e) => { process.stderr.write("error: " + e.message + "\n"); process.exit(1); });
