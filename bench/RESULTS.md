# Voyage 1492 — Results

_Last updated: 2026-07-15_

Voyage 1492 is a 365-turn trading simulation in which an LLM or software agent acts as captain. The current objective is to finish the year with **9,000 ducats in cash**.

> ### Correction (2026-07-15)
> An earlier version of this document reported that a hand-coded **adaptive bot** scored roughly **+4,500** in the randomized *Unknown Sea* and beat every tested LLM by a wide margin. That comparison was **not fair**: the adaptive bot revealed the prices of **all 33 ports on day 0** (an engine call, `recordVisit`, used without sailing), giving it full information, while the LLM agents played under real fog of war (only ports they actually visited were known). We removed the bot's free omniscience and re-ran the comparison under identical fog. **The bot's margin was heavily inflated by the cheat** (its peak fell 40–60% once fogged). The *direction* mostly survives — a simple fogged bot still outscores the best LLM on most worlds — but the gap is far smaller than reported, world-dependent, and on some worlds an LLM is competitive. The corrected numbers are below.

The results support two conclusions:

1. On a **fixed** world, a hand-coded route bot executes a known-profitable loop better than current LLMs. This tests long-horizon execution discipline, not adaptation.
2. In the randomized **Unknown Sea** under fair fog, a simple exploring bot still leads on most worlds, but by a modest and variable margin — not the decisive lead the omniscient bot implied.

The honest description of the project today is a **Weekly Adaptive-Agent Challenge**, not a definitive model-ranking benchmark.

## 1. Fixed-world ceiling (unchanged)

On the classic fixed world, a hand-coded milk-run bot running a **known, hardcoded route** remains the strongest measured agent. It needs no exploration — the profitable route is fixed and memorized.

| Agent or method | Result (fixed classic world) |
|---|---:|
| Hand-coded milk-run bot (known route) | **9,146** |
| GLM direct control | peak **~3,970** |
| grok / Sol policies | **<1,000** |

The fixed world is a control: *can an agent reliably execute a simple profitable policy over 365 turns?* It should not be used to claim one LLM is generally more capable than another.

## 2. Unknown Sea: fair (equal-fog) comparison

The **Unknown Sea** reshuffles the economy every week (base prices scaled 0.65–1.55 per good, production locations shuffled), so a memorized route is worthless. Every agent starts knowing only its home port; prices are revealed **only by sailing** to a port.

Under **identical fog**, game seed 4271, on three published worlds. **Peak cash is the stable metric** — *final* cash is dominated by liquidation slippage (the same agent swung from −1 to +12,482 across worlds), so both are shown but peak is primary.

| World | honest-10 bot (fog) | gemma3:4b · goal | qwen2.5:7b · guide | qwen3.6:27b · expert | omniscient bot *(cheat)* |
|---|---|---|---|---|---|
| 58606565 | 3442 / 968 | **3240 / 2460** | 2311 / −666 | 1000 / 220 | *8862 / 1067* |
| 1433285553 | **7505 / 6930** | 2950 / 2170 | 2905 / 1705 | 1000 / 220 | *12482 / 12482* |
| 1158335470 | **5046 / 4916** | 1970 / 1190 | 1385 / 390 | 1000 / 220 | *7995 / 7930* |

*(peak / final; "honest-10 bot" explores its 10 nearest ports then shuttles the best spread found, no omniscience.)*

### What the fair comparison shows

- **The omniscience cheat inflated the bot's peak by 40–60%** (e.g. 8862 → 3442). Most of the old headline margin was free information, not skill.
- **The bot still leads on most worlds, but modestly.** On 2 of 3 worlds the honest fogged bot beats the best LLM (7505 vs 2950; 5046 vs 1970). On the third (58606565) it is a tie on peak and the LLM wins on final. The bot's edge is real but far smaller and more world-dependent than "+4,500" suggested.
- **gemma3:4b is the strongest LLM here** and is competitive with the fogged bot on one world; other LLMs (qwen2.5:7b, qwen3.6:27b) trail.
- **Brute-force exploration is a trap.** A variant that tries to visit all 33 ports first occasionally won (~9,000 once) but usually collapsed (final −1, +32) — on a large map you cannot afford to explore everything.
- The bot's remaining edge is **execution discipline**, not information: at equal fog it still mechanically completes buy-low/sell-high loops that LLMs abandon. Hiding information alone does not close this gap.

## 3. Multi-model × prompt sweep (Unknown Sea, reproducibility)

Eleven models (0.6B–35B) were run across four prompt levels (none / goal / guide / expert), then the notable results re-run across three more seeds (777 / 1234 / 2025) to separate signal from single-seed noise:

- **gemma3:4b is the robust standout** — with a one-line goal prompt it reaches peak ~3,240 / final ~2,460, **identical across all seeds**; it profits even with no prompt.
- **qwen2.5:7b** profits with a strategy guide (~3,000 peak) but **collapses when over-instructed** (7-step "expert" prompt → paralysis), reproducibly.
- Tiny models (0.6–3B) are paralyzed at every prompt level.
- **Retraction:** an earlier claim that large instruction-mature models (qwen3.6:27b, gemma4:26b) "peak at the expert prompt" was a **single-seed artifact** (seed 4271). On three new seeds those models collapse (peak 1,000 / final 220). Withdrawn.

The finding that reproduces: **the right amount of prompting is model-specific, and no model clears 9,000.**

## 4. What the challenge measures

Exploring a partially observed economy, inferring profitable relationships, trading off exploration against exploitation, revising a failed policy, and executing across 365 turns. The official competition is the weekly same-world ranking; scores from different random worlds are not directly comparable.

## 5. Known limitations

- Small number of seeds and model runs; treat all rankings as provisional.
- Final cash is slippage-noisy; peak is the stabler diagnostic.
- The open arena cannot prove whether an entry used an LLM, a bot, or a hybrid.
- **The world-acceptance gate currently uses the omniscient adaptive bot** to judge solvability; it overstates how solvable a world is and should be revised to gate on a fogged agent.
- Current evidence is insufficient to declare *model X > model Y*.

## 6. Reproduce

```bash
git clone https://github.com/0x8905/voyage-1492.git
cd voyage-1492/bench
node milkrun.mjs      # classic fixed-world route bot → 9,146
```

Random-world runs must record `WORLD_SEED`, agent/model, prompt condition, control mode (direct / policy / bot), and both peak and final cash so the world can be replayed.

## 7. Bottom line

On the fixed classic world a hardcoded route bot scores **9,146** and LLMs reach roughly half — a test of execution, not intelligence. In the **Unknown Sea**, once information is hidden *fairly*, the bot's headline lead was shown to be largely a product of free omniscience: under equal fog a simple bot still wins most worlds but only modestly, LLMs are competitive on some, and blind full exploration is self-defeating. No agent clears 9,000 fairly. Voyage 1492 is most honestly a **Weekly Adaptive-Agent Challenge** — a reproducible open arena for exploration and adaptation, not a settled ranking of model intelligence.
