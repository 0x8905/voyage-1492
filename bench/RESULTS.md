# Voyage 1492 — Results

_Last updated: 2026-07-14_

Voyage 1492 is a 365-turn trading simulation in which an LLM or software agent acts as captain. The current objective is to finish the year with **9,000 ducats in cash**.

The results below support two distinct conclusions:

1. A fixed world primarily tests long-horizon execution discipline.
2. The weekly randomized **Unknown Sea** tests exploration and adaptation to a hidden economy.

The honest description of the project at its current maturity is a **Weekly Adaptive-Agent Challenge**, not a definitive model-ranking benchmark.

## 1. Fixed-world ceiling

On the classic fixed world, a hand-coded milk-run bot remains the strongest measured agent.

| Agent or method | Result |
|---|---:|
| Hand-coded milk-run bot | **9,146** |
| GLM direct control | peak **~3,970** |
| grok and Sol policies | **<1,000** |

Frontier-class LLMs tested—including **GLM-5.2, grok-4.3, and gpt-5.6**—all scored less than half of the milk-run bot.

The measured ceiling of the current world is **9,193**, which is why the cash objective was reduced from 10,000 to **9,000**.

### Interpretation

This is not evidence that the milk-run bot possesses better general reasoning. The fixed economy rewards exact repetition of a known profitable route. A deterministic program can maintain that behavior for the full 365-turn horizon, while current LLM agents struggle with persistent execution discipline.

The fixed world therefore functions best as a control:

> Can an agent reliably execute a simple profitable policy over a long horizon?

It should not be used alone to claim that one LLM is generally more capable than another.

## 2. Unknown Sea: adaptive random worlds

The **Unknown Sea** rearranges the economy every week:

- Base prices are independently scaled by **0.65–1.55** for each good.
- Production locations are shuffled.
- Agents must discover the profitable structure of the new economy.
- `WORLD_SEED` makes each published world deterministic and reproducible.

This changes what the challenge rewards. Memorizing the classic milk run is no longer sufficient.

### Fixed-policy collapse

The classic milk-run bot falls from **9,146** on the fixed world to **390** on a randomized world.

The first published world was even more hostile to the obsolete policy:

| Agent | First published world |
|---|---:|
| Obsolete fixed bot | **-42** |
| Adaptive price-scanning bot | **+4,500** |

The publication gate accepts only worlds satisfying both conditions:

- Obsolete bot: **<6000**
- Adaptive bot: **>=2500**

If no candidate world passes the gate, the challenge falls back to the classic world rather than publishing an unsolvable random economy.

### Interpretation

The random-world result reverses the fixed-world lesson. The deterministic bot dominates when its assumptions remain valid, but collapses when prices and production locations change. LLM agents adapt relatively better because they can inspect observations, revise hypotheses, and change routes.

The first result should be stated narrowly:

> Unknown Sea measures adaptation better than the fixed world, and it can distinguish a memorized policy from an agent that responds to the current economy.

It does not yet justify broad claims such as “model X is better than model Y.”

## 3. Prompt gradient

Prompt quality had no measurable effect in the fixed world; its influence was lost in execution noise.

In the Unknown Sea, the prompt became consequential:

- **a3b** without hints became stuck.
- With a strategy guide, **a3b** moved into profit.
- The guided **GLM** run improved its peak by **+27%**.

This is the intended prompt gradient:

> No guidance → weak exploration or paralysis  
> Strategy guidance → better observation, route selection, and adaptation

The result suggests that good instructions can affect performance when the environment requires a policy to be inferred rather than merely repeated.

## 4. What the challenge measures

Voyage 1492 measures an agent’s ability to:

- Explore a partially observed economy.
- Infer profitable production and demand relationships.
- Trade off exploration time against exploitation.
- Revise a policy when prior assumptions fail.
- Execute decisions consistently across a 365-turn horizon.

The official competition is the weekly same-world ranking. Scores from different random worlds should not be treated as directly comparable.

## 5. Benchmark maturity and limitations

Current evaluation:

- Academic benchmark maturity: **B-**
- Community challenge maturity: **A-**
- Recommended name: **Weekly Adaptive-Agent Challenge**

Important limitations remain:

- The number of evaluated seeds and model runs is small.
- Final cash can be volatile because liquidation is affected by slippage; peak cash is the more stable diagnostic.
- The open arena cannot reliably prove whether an entry used an LLM, a bot, or a hybrid.
- Per-turn evaluation of many models is expensive.
- Current evidence is insufficient to declare **model X > model Y**.

The leaderboard should therefore be read as an open weekly agent competition, not as a controlled academic model ranking.

## 6. Reproduce the public baseline

Requirements:

- Git
- A current Node.js release

Clone the repository and run the public milk-run baseline:

```bash
git clone https://github.com/0x8905/voyage-1492.git
cd voyage-1492/bench
node milkrun.mjs
```

The classic fixed-world milk-run result is:

```text
9,146
```

The reproducible benchmark code is maintained under `bench/`. Random-world results must record the `WORLD_SEED`, agent configuration, prompt condition, and scoring metric used so that the same world can be replayed.

When publishing a run, report at minimum:

```text
World: classic or Unknown Sea
WORLD_SEED: <seed, if randomized>
Agent/model: <name and version>
Prompt condition: none or guide
Control mode: direct, policy, bot, or hybrid
Peak cash: <value>
Final cash: <value>
```

## 7. Bottom line

The classic world exposes a fixed-world ceiling: the milk-run bot scores **9,146**, while all measured LLMs reach roughly half or less.

The Unknown Sea changes the task. The fixed bot collapses from **9,146** to **390**, and to **-42** on the first published world, while an adaptive bot reaches **+4,500**. Prompt guidance also begins to matter, including a **+27%** GLM peak improvement.

That makes Voyage 1492 most honestly useful today as a **Weekly Adaptive-Agent Challenge**: a reproducible open arena for exploration, adaptation, and long-horizon execution—not yet a definitive leaderboard of model intelligence.
