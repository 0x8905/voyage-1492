# VOYAGE 1492 — Benchmark Results

**Claim:** No LLM has cleared this game's 10,000-ducat goal, and the best hand-coded
deterministic strategy can't either. The economy is adversarially designed.

**Engine:** `voyage2.html` · sha256 `819423e824b74562…` · measured 2026-07-14
**Win condition:** reach **10,000 ducats CASH** within 365 days.
*(“value” below = company value = cash + fleet + cargo. The win goal is cash; no run cleared it.)*

## 1. Deterministic milk-run bot (the ceiling)
Best-known hand-coded strategy — buy sugar at Las Palmas, sell in 8-unit lots across
6 ports / 3 regions, repeat. What stops it: VWAP path-invariant settlement, 6-zone
regional demand saturation, and a 1.12 / 0.88 buy/sell spread.

| metric | value |
|---|---|
| peak cash | **9,526** |
| final cash | **9,193** |
| cleared 10,000? | **no** |

Same-port flip exploit (buy→sell same dock): **net −162** → blocked.

## 2. LLM prompt benchmark (24 seasons)
Full-auto 365-day seasons. Prompt levels L1 (none) → L5 (expert milk-run instructions).
Numbers = company value.

| model | seed | L1 | L2 | L3 | L4 | L5 |
|---|---|---|---|---|---|---|
| qwen3.6:35b-a3b | 4271 | 2828 | 1929 | 1417 | 3268 | 2442 |
| qwen3.6:35b-a3b | 2222 | 2765 | 4622 | 4939 | 4166 | 1955 |
| qwen3.6:27b | 4271 | 2554 | 2620 | 3971 | 2971 | 2990 |
| qwen3.6:27b | 2222 | 2062 | 3350 | 3301 | 3993 | 4197 |

**Finding:** prompt detail has no monotonic effect; level variance < seed variance.
Prompts alone don't beat the v2 economy on these models.

## 3. Standing-Policy A/B (qwen3.6:27b)
With the policy compiler (orders → policy → deterministic execution):

| level | seed 4271 | seed 2222 |
|---|---|---|
| L1 (free rein) | **5508** | **8805** |
| L5 (milk-run instruction) | 4273 | 4601 |

**Finding:** the policy system lifts scores 2.2–4.3× vs per-port decisions, and free rein
consistently beats the milk-run instruction — so *the prompt is now a real lever*. Still,
no run cleared the 10,000-ducat cash goal.

## Reproduce
```
npm i playwright && npx playwright install chromium
node bench/milkrun.mjs        # runs the deterministic bot against the live engine
```
The LLM seasons need a local Ollama (or any OpenAI-compatible endpoint); see the runner
scripts in this folder. Engine hash pins the version these numbers were measured on.
