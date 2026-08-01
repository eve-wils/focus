# Prism Terminal overhaul — decisions

Written before any code, per the handoff's Phase 0. Records how the mock's concepts map onto
the state model that already exists, so we don't end up with parallel systems sitting next to
the real ones.

Status: Phase 0. `v:4` → `v:5`.

---

## 0. The points economy is removed

**Decision: delete it.** Not deprecated, not hidden — gone.

This was the single biggest risk item in the handoff ("every mutation that can un-complete
something must reverse its `earn()` exactly once"). Removing the economy removes the whole class
of bug, and with it the need for `recomputeDayCents()`, the dev assertions, and most of the
handoff's Phase 5.

Removed: `S.cents`, `d.ptsEarned`, `t.paidCents`, `S.treats`, `S.redeemed`,
`CENTS`, `PAPER_STATUS_CENTS`, `WEEKLY_TARGET_CENTS`/`WEEKLY_CAP_CENTS`,
`earn()`, `centsFor()`, `payUnitTo()`, `settlePay()`, `weeklyCents()`,
`rebalancePointsScale()`, `dollarsStr()`, `fmtSigned()`, `ptsStr()`, `redeem()`,
the treats card, the bank/points pill, and the weekly earning cap.

Kept: `celebrateBurst()` and the toasts. The feedback was never the problem — the ledger was.

**Stored data is not destroyed.** The migration stops reading and writing these fields but leaves
whatever is already in `state.json` untouched, so a historical record survives if we ever want it.
Nothing in the app references it after v:5.

### What happens to `S.spendLog`

The handoff calls `spendLog` "the ledger of the app's internal points economy" and says to leave
it alone. That is half right. `logSpend(name, amountCents, dayKey)` takes a **real dollar amount**
typed into a form and debits `S.cents` with it, deliberately allowing a negative balance as a
"deficit" — so it is a real-spending log that happened to be charged against earned points.

With points gone the debit is meaningless but the entries are not: they are already
`{id, name, amount, at, day}`, which is the mock's transaction shape minus a category.

**Decision:** migrate `spendLog` → `S.txns`, dropping `balanceAfter` and defaulting `cat` to
`'Uncategorized'`. The no-spend streak (`spentOnDay`/`noSpendStreak`) is a genuinely separate,
still-useful feature and now reads `S.txns`. This supersedes the handoff's "add `S.txns` as a new
slice and leave `spendLog` alone" — that advice existed only to protect the treat-affordability
math, which no longer exists.

---

## 1. Money — the `$` ring

`S.budget = { monthlyCents, startsOn }`, `S.txns = [{id, name, amountCents, cat, day, at}]`,
`S.txnCats = [...]`. The ring shows remaining ÷ monthly for the current budget period.

`S.txns` is seeded from `spendLog` (above), so existing spending history carries over rather than
starting empty.

Amounts stay in **integer cents**, matching how the repo has always stored money. The mock's
`amount: 8.40` is a display concern, parsed on input and formatted on output.

---

## 2. Water — the `≋` ring

Already fully implemented: `d.water`, `d.log[]` (per-sip, so undo works), `addWater()`, streaks,
freezes, and vessels (`S.vessels`/`S.vesselIdx`). Only the goal is wrong: `WATER_GOAL = 100` is a
module constant at `app.js:2` and the mock wants it editable.

**Decision:** `WATER_GOAL` const → `S.waterGoal`, backfilled to the current **100** (not the
mock's illustrative 80 — that number is placeholder data, and the user's real goal must survive
migration).

**On rewriting history:** the handoff offers "freeze historical evaluation, or accept and document
that streaks recompute". We do neither exactly. The `day()` initializer snapshots the goal in
effect onto the day record as `d.goal` when the day is first created, and `dayCounts(k)` reads
`dd.goal ?? 100`. Changing the goal today therefore cannot retroactively make a past day pass or
fail. `backfillWaterGoal()` stamps `d.goal = 100` on every existing day. One line in the
initializer, and `reconcile()` — which walks history handing out freezes — becomes safe for free.

---

## 3. Habits — the BIO grid

The mock shows 8 free-form habit rows. The repo **derives** habit rows and does not store them:
`HABIT_STREAKS` (`app.js:~2945`) is a hardcoded list of three — `sunrise`, `moonlight`, `water` —
and `habitDoneOnDay()` special-cases each.

**Decision: no `S.habits` array.** But the hardcoded three are also wrong, because `S.ritualDefs`
is already user-extensible via `addRitualDef()`.

Derive the grid from `S.ritualDefs`: one row per ritual (its seal, `d.done['seal_' + id]`), plus
the water row. That yields as many rows as the user has rituals, with no new state, and adding a
row is `addRitualDef()` — which already works. If the user wants a habit that isn't a ritual, the
answer is to extend the ritual model, not to bolt on a parallel list.

---

## 4. Food — the apple ring

Genuinely new; nothing in the repo logs meals. Day-keyed for consistency with water:

```
S.days[k].meals = [{ id, at, cats: [...] }]
```

Scoring (documented beside the function, single definition, used by the ring and by `dayScore`):

```
HEALTHY = veggies, protein, berries, greens, dairy
POOR    = sugary, fried, starch
NEUTRAL = grains          (counts toward neither)

foodScore(day) = good / (good + bad), or 0 when nothing is logged
```

Taken from the mock's own `dayScore` (mobile file, ~line 818). `grains` appearing in neither list
is deliberate, not an oversight: it is a neutral filler that shouldn't reward or penalise.

---

## 5. Discrete tasks — a collision the handoff missed

The handoff proposes adding `type: 'simple' | 'discrete'` plus `goal` / `metric` / `count`.
**Do not.** The repo already has a full task-mode system at `app.js:1203–1226`:

| mock            | repo                                              |
| --------------- | ------------------------------------------------- |
| `type:'simple'`   | `mode:'simple'`                                   |
| `type:'discrete'` | `mode:'count'`                                    |
| `goal`            | `targetN` (via `targetOf()`)                      |
| `count`           | `doneN` (via `progressOf()`)                      |
| —                 | `cumulative` / `timed` modes, `paceSecPerUnit()`  |

Adding the mock's fields would create exactly the parallel system the handoff warns about, and
would break the pace/estimate math that reads `timedN`. The SIMPLE/DISCRETE toggle writes `mode`;
the goal field writes `targetN`; `metric` is the one genuinely new field (a display label).

The mock's rule "goal < 10 renders tap-to-fill checkmarks, goal ≥ 10 renders a `+` counter" is a
render-time branch on `targetOf(t)`, not stored state.

---

## 6. The task tree mostly already exists

The handoff's `backfillTaskTree()` — "adds `parentId`, `order`, `type`, `goal/metric/count`,
`day/blockId/atMin/pinned/repeat`" — is largely unnecessary. `makeUnit()` (`app.js:820`) already
creates `parentId`, `subtaskIds`, `order`, `day`, `blockId`, `bucket`, `estMin`, `sched`.

Nesting is capped at one level by the **renderer**, not the model: `if (isTask && !t.parentId)`
at `1658` and `1686`. "Nested at any depth" is a recursive render plus removing those two guards.

`byOrder`/`siblingGroup` (`2092–2133`) already scope `order` to siblings and already support both
arrow buttons and drag — which is the handoff's "reorder anywhere" requirement, already built.
Phase 3 extends `siblingGroup` to two new containers (the rail, and cross-day moves) rather than
building reordering from scratch.

**Genuinely new fields:** `atMin` and `pinned` (rail pinning), and `metric`. That is all.

---

## 7. Recurring blocks follow the ritual-block precedent

The handoff says expand recurrence at render time, never write duplicate rows into future days.
Agreed — and the repo already does exactly this for ritual blocks:

- `ensureRoutineBlocks(k)` materialises `routine_<defId>_<dayKey>` into `S.days[k].blocks`
- the prune at `~2325` removes those instances again if they were never touched
- `isEmptyBlock(b)` defines "never touched"

**Decision:** recurring user blocks get the same machinery. `S.blockRules = [{id, dow, start, end,
title, cat, kind, repeat, keepTasks, message}]`, materialised by `ensureRuleBlocks(k)` with
deterministic `rule_<ruleId>_<dayKey>` ids, pruned when untouched. Editing a materialised instance
detaches it from its rule and it becomes historical fact.

Past days are never rewritten because instances only exist once touched.

---

## 8. Blocks do not own their tasks

The design file models blocks with an inline `event.tasks: [{name, done, ...}]`. The repo does not:
`blockTasksFor(b, k)` (`app.js:2087`) filters `S.tasks` by `blockId` + `day`, after a completed
`migrateBlockTasksToUnified()`.

**Decision:** the block editor's task list reads through `blockTasksFor()`. No inline array. Do
not copy the mock's shape here — it is design-file scaffolding, not a data model.

---

## 9. Theme — replaced, but tokenised

**Decision: the terminal look replaces the theme system.** The 5 preset themes, saved themes, and
the color-picker panel come out.

However — the user wants configurable colors *eventually*. So this is a replacement of the theme
**system**, not a hardcoding of the palette. Every terminal color lands as a CSS custom property
in one `:root` block, and nothing in `styles.css` gets a literal hex. Reintroducing a picker later
is then a UI job against tokens that already exist, not an archaeology job.

`styles.css` currently has **102 `border-radius` declarations** and the terminal design has none
except circular rings, so radius becomes a token too (`--radius: 0`), rather than 102 deletions
that would have to be undone if the look ever softens.

---

## 10. `dayScore()` replaces two incumbents

The handoff specifies one pure `dayScore(dayKey)` with three call sites. There are already **two
competing day scores** in the code:

- `render()` at `~3703`: `overall = habitPct × 0.7 + waterPct × 0.3` → the header bar
- `dayStats(k)` at `~4047`: a different shape → the month view

Adding a third would leave three. `dayScore(dayKey)` is defined once as the mean of
water% / food / habit% / block-completion%, and **both incumbents are retired to call it**. Future
days score 0, not partial.

---

## 11. Navigation

The mock's 4-tab nav (SCAN / TASKS / BIO / GRID) remaps the existing `setView()` router rather
than adding a second one. One router, one source of truth. Desktop keeps its wider tab set; the
`notes` and `more` content folds into BIO and GRID on mobile.
