# BrandOS — Quick Reference Card

> For full details, see [BRANDOS-PROJECT-MASTER.md](./BRANDOS-PROJECT-MASTER.md)

---

## Where Are We?

| Metric | Value |
|---|---|
| Features built | **~25%** of BRD |
| Critical security issues | **5** (must fix before anything) |
| Missing core features | AI, Exports, Collaboration, WCAG, Billing |
| What works well | Landing page, Auth, Onboarding, Basic dashboard |

---

## What To Do (In Order)

### NOW — Security Fixes (Week 1)

| # | Task | File(s) | Done |
|---|---|---|---|
| 1 | Add `.env` to `.gitignore`, remove from git | `.env`, `.gitignore` | [ ] |
| 2 | Delete `createAdminUser.ts` | `createAdminUser.ts` | [ ] |
| 3 | Use env vars for Supabase keys | `src/integrations/supabase/client.ts` | [ ] |
| 4 | Remove hardcoded admin email checks | `DashboardNavbar.tsx:21`, `AdminPanel.tsx:14`, `DashboardSidebar.tsx:89` | [ ] |
| 5 | Consolidate 3 service layers into 1 | `src/shared/services/` | [ ] |
| 6 | Remove dead sidebar links (8+ routes 404) | `DashboardSidebar.tsx` | [ ] |
| 7 | Delete duplicate components & Vite boilerplate | `App.css`, duplicate Button/toast/landing | [ ] |

### NEXT — Stabilize (Weeks 2-3)

| # | Task | Done |
|---|---|---|
| 8 | Create missing 9 DB tables in Supabase | [ ] |
| 9 | Wire editor to Supabase (not localStorage) | [ ] |
| 10 | Upload logos to Supabase Storage | [ ] |
| 11 | Build font editor + brand info editor | [ ] |
| 12 | Fix 3 broken guideline templates | [ ] |

### BUILD — Core Differentiators (Weeks 4-8)

| # | Task | Why it matters | Done |
|---|---|---|---|
| 13 | AI service + per-section suggestions | **Your #1 moat** | [ ] |
| 14 | PDF guideline export | Users need tangible output | [ ] |
| 15 | ZIP asset bundle export | Pro/Agency value | [ ] |
| 16 | WCAG color contrast engine | Named differentiator | [ ] |

### **-> LAUNCH MVP HERE (~Month 2)**

### GROW — Post-Launch (Months 3-4)

| # | Task | Done |
|---|---|---|
| 17 | Collaboration (4 roles, team invites) | [ ] |
| 18 | Stripe billing + plan gating | [ ] |
| 19 | Brand applications (business cards, social kits) | [ ] |
| 20 | Public showcase + custom domains | [ ] |

---

## Top Competitive Threat

**Canva** — massive reach, adding brand features. Your edge: full lifecycle (Create->Systemize->Apply->Maintain) + AI-first + depth over breadth.

---

## 3 Rules

1. **No new features until security is fixed** (tasks 1-7)
2. **AI is your moat** — prioritize it over templates
3. **Launch at 60%, iterate on feedback**
