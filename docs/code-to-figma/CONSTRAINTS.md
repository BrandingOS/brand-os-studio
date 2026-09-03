# Figma account constraints — measured, not assumed

Every row below was hit in practice during Cycle 0, not read off a pricing page.

| Constraint | Value | How it was discovered | Impact |
|---|---|---|---|
| **MCP tool calls** | **20 per month** (Starter, any seat) | `use_figma` refused mid-Cycle-0: *"You've reached the Figma MCP tool call limit on the Starter plan."* Confirmed against `file://figma/docs/rate-limits-access.md` | **Blocks autonomous execution.** See below. |
| Pages per file | **3** | `figma.createPage()` threw: *"The Starter plan only comes with 3 pages."* | 13 delivery divisions become 13 named `SECTION`s across 3 pages |
| Seats | `Full` only on **Personal Components**; `View` on *Brand OS* and *hamza's Starter team* | `whoami` | All work targets Personal Components |
| Variable modes | 1 per collection | Starter | `theme=light\|dark` variant axis instead of a mode toggle |
| Code Connect | Unavailable | *"You need a Dev or Full seat on an Organization or Enterprise plan."* | Recorded as unavailable-optional, per owner decision 7. Not a blocker. |
| Library publishing | Unavailable | Starter | **One file is mandatory** — cross-file component reuse would need a published library |

## The tool-call ceiling is the blocker

Per Figma's own rate-limit document, a **Starter** plan gets **up to 20 tool calls
per month** regardless of seat. Per-day limits (200/day) begin at Professional
with a Full or Dev seat.

`create_new_file`, `whoami` and `add_code_connect_map` are exempt. Everything
else counts — including every read: `get_metadata`, `get_variable_defs`,
`get_screenshot`, `get_design_context`, and every `use_figma`.

The month's quota was consumed by the preflight plus the start of Cycle 0:

| Spend | Approx. calls |
|---|---|
| Preflight writes + read-back verification | ~5 |
| Preflight reads (`get_metadata`, `get_variable_defs`, `get_screenshot`) | ~4 |
| Independent reviewer subagent's own read-only audit | ~6 |
| Cycle 0 skeleton (probe, pages, 2 of 3 section calls) | ~5 |

**Lesson recorded:** a reviewer subagent's "read-only" audit is not free. On a
metered transport, verification competes with production for the same quota.
Future reviewers must be handed captured evidence rather than live MCP access.

## What this costs

The Definition of Done cannot be reached on 20 calls/month. The micro-loop alone
spends ~4–6 calls **per slice** (generate → read back → verify → screenshot), and
the plan has dozens of slices across Cycles 1–12. One cycle exceeds a month's
quota.

Three ways forward, recorded for the decision record:

1. **Professional plan, Full seat** — 200 calls/day, 10/min. Makes the stated DoD
   reachable as specified. This is a money decision only the owner can take.
2. **Local plugin transport** (`figma-plugin/`) — runs inside Figma via the Plugin
   API, **consumes zero MCP quota**, and is unmetered. But it requires a human to
   press Run, which owner decision "do not ask me to import or run a plugin"
   forbids. Viable only if that rule is relaxed.
3. **Wait for the monthly reset** — does not help; 20 calls/month cannot build
   this system in any number of months, because verification is per-slice.

Owner decisions 5 and 6 — keep `figma-plugin/`, and find a *shared* renderer so
the repository never maintains two rendering implementations — are now
load-bearing rather than precautionary. The architecture that follows is
**one deterministic renderer, two interchangeable transports**:

```
repo-owned renderer  ──emits──>  render plan (pure data)
                                      │
                        ┌─────────────┴─────────────┐
                   MCP transport              plugin transport
                   (metered, autonomous)      (unmetered, human-triggered)
```

Because the render plan is pure data and both transports execute the same Plugin
API surface, the transport is a swap, not a rewrite. This is the answer to
decision 6, and the quota ceiling is what makes it necessary rather than tidy.
