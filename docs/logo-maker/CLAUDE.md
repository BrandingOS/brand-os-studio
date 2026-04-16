# CLAUDE.md — Logo Maker Feature

This file gives you (Claude Code) the bare-minimum context to start working. The full spec is in `LOGO_MAKER_SPEC.md` in the same directory — **read it first, entirely, before writing any code.**

---

## What we're building
The best logo maker in the world, as a core feature of BrandingOS (brandingos.ai).

## How to approach this
1. Read `LOGO_MAKER_SPEC.md` cover to cover.
2. Read `QUESTIONS_FOR_HAMZA.md` and make sure Hamza has answered before you start Phase 0.
3. Start Phase 0. Do NOT skip phases. Each phase has a checkpoint — verify it before moving on.
4. Commit after every phase using the commit message provided in the spec.
5. If something is ambiguous: flag it, propose your best answer, continue. Don't block.

## Non-negotiables
- **4 modes** (AI, Guided Wizard, Blank Canvas, Upload) — all working, all interchangeable.
- **Auto brand registration** — when the user hits Save on Screen 6, a Brand object is created in the workspace with a UUID, share link, and full asset bundle. This is the killer feature; don't ship without it.
- **Fabric.js v6** for the editor. Not Konva. Not a custom canvas.
- **Claude API** for AI orchestration, **Gemini 3 Pro Image** for visual generation. The `nanobanana` skill in `/mnt/skills/user/nanobanana/` is Hamza's existing setup — use it.
- **Cloudflare everything** — Workers, D1, R2, Pages. The infrastructure is already wired up; do not introduce AWS or Vercel.

## Repo context
- Existing repo: `brand-os-studio` (GitHub)
- Existing project: `landingpage/` subfolder is a Vite + React app
- Existing deployment: Cloudflare Pages → `https://brand-os-studio-dxw.pages.dev/`
- Custom domain: `brandingos.ai` (migration in progress)
- Hamza works with Git worktrees — be clean with branch names, one branch per phase.

## Hamza's concerns
- He runs **multiple Claude pipelines in parallel** modifying the same codebase. To prevent merge conflicts:
  - Keep each AI service in its own module (`/src/services/ai/<name>.service.ts`)
  - Services never import from each other; shared logic goes in `/src/services/ai/shared/`
  - Commit often, one logical change per commit
- He prefers **incremental, testable progress** over massive PRs. Phase boundaries in the spec are the natural PR boundaries.

## When in doubt
The spec is the source of truth. If the spec and this file conflict, follow the spec. If the spec is ambiguous, ask Hamza. If Hamza is unavailable, propose in a comment and proceed.

## What success looks like
A user types `brandingos.ai/logo-maker`, picks a mode, answers a few questions, sees 36 AI-generated logos, picks one, edits it, gets a full brand kit, and lands on a "Lumina is now live in your workspace" screen — all in under 5 minutes, all auto-saved, all beautiful.

Build that. Don't settle for less.
