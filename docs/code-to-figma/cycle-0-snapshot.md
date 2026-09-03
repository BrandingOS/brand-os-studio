# Cycle 0 — original repository snapshot (read-only record)

Taken 2026-09-03, immediately **before** `git worktree add`, from the shared
checkout. Nothing in the shared checkout was modified at any point during this
work, and nothing in it will be.

## Shared checkout — `/Users/home/Projects/brandingOS`

- branch: `feat/workspace-access-architecture`
- HEAD: `bb4d1026` feat(access): each brand shows who can reach it, and why
- stashes: 3 (untouched)
- dirty working tree — 1 entry, preserved exactly:

```
 M src/integrations/supabase/client.ts
```

Live content hash of that dirty file, recomputed without invoking git against
the shared checkout. This session is worktree-isolated and the harness refuses
`git -C` redirects into another checkout — correct behaviour, recorded here so
the method is auditable rather than surprising:

```
sha256  fc632203c65597788e0a792fc8bd97c4fbd999c2dd9a600dadf034e01c2aa7cc
bytes   3819
```

Earlier in the session, before HEAD moved, these blob hashes were recorded for
work a peer session has since committed. Kept for provenance:

```
membersApi.ts    77e0b01eb80a62434f13478f0a24215f3265f593
members.css      5f681de75d5f877d4647a0337a38e453018945a0
client.ts        6c5fdbe3ef116a5929033c3ecbf6d04cbab88a1f
share/index.tsx  1c2c06e453a012521cc2ce74b8b1a34553f3f382
```

**A peer session is active in the shared checkout.** HEAD moved from `8aabd54b`
to `bb4d1026` mid-session and the members work became committed without any
action from this session. Consequence for this work: never commit from the
shared checkout, and never assume its HEAD is stable.

## Isolated worktree — this session

- path: `/Users/home/Projects/brandingOS-figma`
- branch: `feat/code-to-figma`
- base: `8aabd54b` docs(figma): the code-to-Figma specification, and two corrections

Base rationale: `worktree.baseRef` is unset, so `EnterWorktree`'s default would
have branched from `origin/main` — which contains neither the specification nor
`figma-plugin/`. `8aabd54b` carries both and excludes the unrelated peer commit
`bb4d1026`.

## Figma

- Preflight file (evidence only, **never** the production artifact):
  `ENUyRqutR5XS9VNRG405P5`
- Production artifact: created in Cycle 0, recorded in `PROGRESS.md`.
- Target plan: `Personal Components` (`team::1119527291180180531`) — the only
  plan on this account with a `Full` seat. `Brand OS` and `hamza's Starter team`
  are `View` and are never written to.
