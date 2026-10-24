# Branching — how code moves, and what is live

**GitHub is the source of truth.** Whoever works — the owner on a laptop,
Claude from a phone session, a Claude Code agent — pushes to GitHub and
pulls from it. Nothing is "done" while it exists only on one machine.

## The branches that exist, and why

| Branch | Role | Who moves it |
|---|---|---|
| `main` | **The trunk.** Every finished piece of work lands here. Always the newest working code. | Merges / fast-forwards from feature branches |
| `demo` | **What is live.** Cloudflare Pages project `demo` → https://demo.brandingos.ai (and `demo-b`) builds from it. | Release only: fast-forward to `main` |
| `dev` | Wired to a Cloudflare build. Kept, not worked on. | Leave alone until its Cloudflare project is confirmed |
| `x` | Peer deploy target (see CLAUDE.md history). Kept, not worked on. | Leave alone until its Cloudflare project is confirmed |
| `feat/<name>` | One piece of work. Short-lived. | Deleted once merged into `main` |

Rule of thumb: if it is not `main`, `demo`, `dev`, `x`, or an open
`feat/*`, it should not exist.

## Day-to-day

```bash
git checkout main && git pull            # start from the trunk
git checkout -b feat/<name>              # one branch per flow/feature
# … work, commit …
git push -u origin feat/<name>
# done → fast-forward or merge into main, push main, delete the branch
git checkout main && git merge --ff-only feat/<name> && git push origin main
git push origin :feat/<name>
```

## Releasing (what makes something live)

A release is a fast-forward of `demo` to `main` — never a merge:

```bash
git push origin origin/main:refs/heads/demo
```

**"Is X live?"** → `git merge-base --is-ancestor <commit> origin/demo`.
**"What is waiting to go live?"** → `git log --oneline origin/demo..origin/main`.

## Archived branches (2026-10-24)

These branches were fully contained in `main` (every commit is in its
history), so nothing was lost by removing them. To bring one back exactly
as it was: `git push origin <sha>:refs/heads/<branch>`.

| Branch | Tip | Last commit | Subject |
|---|---|---|---|
| `feat/build-intent-workspace` | `77cffc3d56` | 2026-10-12 | feat(build-intent): add conversational editing and live local Codex prototypes |
| `feat/start-from-logo` | `e91853c4ca` | 2026-10-12 | feat(onboarding-logo): one box instead of a questionnaire |
| `feat/new-design-studio` | `77eb521240` | 2026-09-20 | perf(editor): publish a gesture once per frame |
| `feat/brand-kit-experience` | `2290018fb9` | 2026-09-16 | refine(brand-kit): Colors and Typography show the asset |
| `ui` | `84955ee576` | 2026-09-10 | fix(brands): creating a brand must not ask Postgres to hand the row back |
| `codex/3d-logo-studio` | `594790beb0` | 2026-09-09 | feat(3d-logo): Sphere |
| `feat/workspace-access-architecture` | `da49118294` | 2026-09-06 | fix(theme): one owner for light/dark |
| `v1-release` | `2461296c1b` | 2026-09-05 | fix(test): two unit tests that failed only under Node 26 |
| `feat/brand-kit-simplification` | `ab61ecfe0b` | 2026-08-29 | test(onboarding): type the coverage map |
| `guideline` | `b69b1286f5` | 2026-08-24 | feat(guideline): the editor system lab |
| `release/icons` | `3b6beebbaa` | 2026-08-20 | fix(branding): the tab shows the BrandingOS mark |
| `feat/settings-system` | `36296f0ee4` | 2026-08-19 | refactor(guideline): use the /b design system |
| `v3-onboarding` | `2f2613fedb` | 2026-08-18 | perf(dashboard): one Library read for the whole brand list |
| `v3-brand-system` | `40ca41f2ba` | 2026-08-13 | docs(001): mark the Brand System Foundation complete |
| `phase-6-brand-memory` | `9f7073bb0d` | 2026-07-31 | fix(infra): add Supabase keep-alive workflow |
| `phase-5-resize-variants` | `7aa6b15f55` | 2026-05-05 | fix(variants): drop redundant prefix in family-export filename |
| `phase-b-feature-ports` | `07b669a8b2` | 2026-05-05 | refactor(css): cosmos-workspace.css → workspace.css |
| `phase-b-templates-port` | `3f2fdc5637` | 2026-05-05 | feat(templates): port Phase 4 Content Universe into Studio |
| `phase-a-ui-migration` | `484e4490d6` | 2026-05-05 | docs(phase-a): UI Architecture in CLAUDE.md |
| `backend-system` | `206ffc0f54` | 2026-04-12 | fix: disable Google/Facebook OAuth buttons |

## Branches with work NOT in `main` (decision pending)

| Branch | Commits not in `main` | Owner | Status |
|---|---|---|---|
| `feat/code-to-figma` | 44 | Hamza | Figma plugin work — merge or archive |
| `landing-page` | 3 | Nidal | Landing rebuild + onboarding handoff — ask Nidal |
| `new-ui` | 4 | Nidal | `landingpage-v2` fork, overlaps `landing-page` — ask Nidal |
