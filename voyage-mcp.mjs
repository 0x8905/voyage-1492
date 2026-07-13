#!/usr/bin/env node
// VOYAGE 1492 — MCP server. Exposes the trading game as native tools for Claude / any MCP client.
//   claude mcp add voyage -- npx -y voyage-1492-mcp
// Requires playwright (peer dep). Speaks MCP over stdio, JSON-RPC 2.0. No telemetry, no auto-update.
// Env: VOYAGE_URL (default https://voyage1492.com/play/), VOYAGE_PROFILE (default ./.voyage-profile), VOYAGE_CHROME (optional executablePath)

import { chromium } from "playwright";
import path from "node:path";
import process from "node:process";

const URL = process.env.VOYAGE_URL || "https://voyage1492.com/play/";
const PROFILE = process.env.VOYAGE_PROFILE || path.resolve(".voyage-profile");

let ctx = null, page = null;
async function game() {
  if (page && !page.isClosed()) return page;
  const opts = { headless: true };
  if (process.env.VOYAGE_CHROME) opts.executablePath = process.env.VOYAGE_CHROME;
  ctx = await chromium.launchPersistentContext(PROFILE, opts);
  page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => typeof window.Voyage === "object", null, { timeout: 20000 });
  await page.evaluate(() => { try { if (typeof hasSave === "function" && hasSave() && typeof loadGame === "function") { loadGame(); document.querySelectorAll(".scene-back").forEach((el) => el.remove()); } } catch (e) {} });
  return page;
}
async function save() { try { await page.evaluate(() => { try { saveGame(); } catch (e) {} }); } catch (e) {} }

const TOOLS = [
  { name: "voyage_new", description: "Start a new season. Optionally set era (discovery|plague), home port, standing orders for the AI, and auto mode.", inputSchema: { type: "object", properties: { era: { type: "string" }, home: { type: "string" }, orders: { type: "string" }, auto: { type: "boolean" } } },
    run: async (p, a) => p.evaluate(({ era, orders, home, auto }) => { try { wipeSave(); } catch (e) {} const E = ERAS_CFG.find((e) => e.id === era) || ERAS_CFG[0]; const H = (typeof HOMES_CFG !== "undefined" && HOMES_CFG.find((h) => h.port === home)) || HOMES_CFG[0]; window.__pendingOrders = orders || ""; document.querySelectorAll(".scene-back").forEach((el) => el.remove()); applyNewGame(E, H, "", !!auto && LLM_CFG.enabled); if (orders) Voyage.orders(orders); return Voyage.state(); }, a) },
  { name: "voyage_state", description: "Get the full current game state: day, funds, goal, captains, prices, events & rumors, ports, goods.", inputSchema: { type: "object", properties: {} }, run: (p) => p.evaluate(() => Voyage.state()) },
  { name: "voyage_route", description: "Preview a route: distance and estimated sail days between two ports.", inputSchema: { type: "object", properties: { from: { type: "string" }, to: { type: "string" } }, required: ["from", "to"] }, run: (p, a) => p.evaluate(({ from, to }) => Voyage.route(from, to), a) },
  { name: "voyage_sail", description: "Order a captain to sail to a port.", inputSchema: { type: "object", properties: { captain: { type: "string" }, port: { type: "string" } }, required: ["captain", "port"] }, run: (p, a) => p.evaluate(({ captain, port }) => Voyage.sail(captain, port), a) },
  { name: "voyage_trade", description: "Buy or sell a good at the captain's current port.", inputSchema: { type: "object", properties: { captain: { type: "string" }, side: { type: "string", enum: ["buy", "sell"] }, good: { type: "string" }, qty: { type: "number" } }, required: ["captain", "side", "good", "qty"] }, run: (p, a) => p.evaluate(({ captain, side, good, qty }) => Voyage.trade(captain, side, good, qty), a) },
  { name: "voyage_escorts", description: "Set escort ships (0-3) for a captain's next departure. 40 ducats each.", inputSchema: { type: "object", properties: { captain: { type: "string" }, n: { type: "number" } }, required: ["captain", "n"] }, run: (p, a) => p.evaluate(({ captain, n }) => Voyage.escorts(captain, n), a) },
  { name: "voyage_advance", description: "Advance time by up to 30 days. Stops at season end. Returns events that happened.", inputSchema: { type: "object", properties: { days: { type: "number" } }, required: ["days"] }, run: (p, a) => p.evaluate(({ days }) => Voyage.advance(days), a) },
  { name: "voyage_identify", description: "Set your Hall of Fame name for this run.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] }, run: (p, a) => p.evaluate(({ name }) => Voyage.identify(name), a) },
  { name: "voyage_result", description: "Get the final scorecard: funds, company value, goalReached.", inputSchema: { type: "object", properties: {} }, run: (p) => p.evaluate(() => Voyage.result()) },
];
const BY_NAME = Object.fromEntries(TOOLS.map((t) => [t.name, t]));

// ── minimal MCP over stdio (JSON-RPC 2.0, line-delimited via Content-Length framing) ──
let buf = Buffer.alloc(0);
process.stdin.on("data", (chunk) => {
  buf = Buffer.concat([buf, chunk]);
  for (;;) {
    const sep = buf.indexOf("\r\n\r\n");
    if (sep < 0) return;
    const header = buf.slice(0, sep).toString();
    const m = /Content-Length:\s*(\d+)/i.exec(header);
    if (!m) { buf = buf.slice(sep + 4); continue; }
    const len = +m[1];
    if (buf.length < sep + 4 + len) return;
    const body = buf.slice(sep + 4, sep + 4 + len).toString();
    buf = buf.slice(sep + 4 + len);
    handle(JSON.parse(body));
  }
});
function send(msg) {
  const s = JSON.stringify(msg);
  process.stdout.write("Content-Length: " + Buffer.byteLength(s) + "\r\n\r\n" + s);
}
async function handle(req) {
  const { id, method, params } = req;
  try {
    if (method === "initialize") return send({ jsonrpc: "2.0", id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "voyage-1492", version: "0.1.0" } } });
    if (method === "notifications/initialized") return;
    if (method === "tools/list") return send({ jsonrpc: "2.0", id, result: { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) } });
    if (method === "tools/call") {
      const t = BY_NAME[params.name];
      if (!t) return send({ jsonrpc: "2.0", id, error: { code: -32601, message: "unknown tool" } });
      const p = await game();
      const out = await t.run(p, params.arguments || {});
      await save();
      return send({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }] } });
    }
    if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32601, message: "method not found" } });
  } catch (e) {
    if (id !== undefined) send({ jsonrpc: "2.0", id, error: { code: -32603, message: String(e && e.message || e) } });
  }
}
process.on("SIGINT", () => { try { ctx && ctx.close(); } catch (e) {} process.exit(0); });
process.on("SIGTERM", () => { try { ctx && ctx.close(); } catch (e) {} process.exit(0); });
