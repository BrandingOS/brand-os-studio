# Questions for Hamza — Answered

Claude Code needs these answers before it starts. Answered by Hamza on 2026-04-17.

---

### 1. Auth provider
Which auth system do you want?
- [ ] Clerk (recommended for speed)
- [x] Supabase Auth
- [ ] Custom (NextAuth-style)
- [ ] Already using something in `brand-os-studio` — tell us what: _____________

**Your answer:** Supabase Auth (already using Supabase for login, integrated with Google and Facebook login).

---

### 2. Pricing model
The spec defaults to Free / Pro / Team with these rate limits:
- Free: 3 logo generations/day
- Pro: 50/day
- Team: unlimited

Is that right? If not, give us the limits you want:

**Your answer:** Free: 3 logo generations/day. Unlimited for premium users. (Collapse Pro + Team into a single premium tier.)

---

### 3. Existing design tokens
Does `brand-os-studio` already have a Tailwind config or a design system?
- [x] Yes — link to the config file: check codebase
- [ ] No — create a new one following the spec

**Your answer:** Yes — check codebase and reuse existing tokens.

---

### 4. Claude API key
- [ ] I have an existing Anthropic org account — I'll provide the key as an env var
- [ ] Set up a new account — tell me the steps
- [x] Use existing one from another BrandingOS pipeline

**Your answer:** Already have access inside Claude (existing pipeline). Reuse.

---

### 5. Gemini API key
Same question for Gemini 3 Pro Image (Nano Banana).
- [ ] I have the key
- [ ] Using the existing `nanobanana` skill setup
- [ ] Need to provision

**Your answer:** No paid Gemini API yet. Ask before making any live calls. For now, use the `nanobanana` skill setup where possible and stub Gemini behind `gemini-client.ts` so we can swap in a real key later without touching callers.

---

### 6. API domain
Where should the backend live?
- [ ] `api.brandingos.ai` (subdomain)
- [ ] `brandingos.ai/api` (path-based)
- [ ] Separate Cloudflare Worker with its own domain: _____________

**Your answer:** Already exists in codebase — check and reuse current backend setup.

---

### 7. Analytics
Which analytics tool do you want me to wire events to?
- [ ] PostHog
- [ ] Plausible
- [ ] Mixpanel
- [x] Google Analytics
- [ ] None for v1 — add later
- [x] Already using: Google Analytics + Google Clarity

**Your answer:** Google Analytics + Google Clarity.

---

### 8. Cloudflare resources
- D1 database: already provisioned — check codebase
- R2 bucket: already provisioned — check codebase
- Workers: existing Worker project — check codebase

**Your answer:** Already exist in codebase. Reuse rather than creating new.

---

### 9. Existing Brand schema
If BrandingOS already has a "Brand" entity anywhere in the codebase, link it so we can align — we don't want two competing Brand schemas.

**Your answer:** Already exists in codebase. Find it, understand it, and align — do not create a competing schema.

---

### 10. Scope for v1
The spec lists 12 mockup templates (business card, t-shirt, etc.). That's a lot to build. For v1, should we:
- [x] Build all 12 as specced
- [ ] Start with 4 (business card, t-shirt, mobile icon, Instagram post) and add more later
- [ ] Different subset: _____________

**Your answer:** Build all 12 as specced AND make adding new mockups easy (well-designed template registry so new mockups are ~minutes to add, not hours).

---

### 11. Integration priorities
On Screen 6 ("Brand Registered"), the spec shows 4 next-step CTAs: Landing Page, Social Posts, Video Ads, Invite Team. Which of these actually exist as features today?
- [ ] Landing Page Generator — exists / stub it
- [ ] Social Content — exists / stub it
- [ ] Video Ads — exists / stub it
- [ ] Invite Team — exists / stub it

**Your answer:** Unknown — check the codebase. If a feature exists, deep-link to it. If not, stub with a "Coming soon" state.

---

### 12. Any other context Claude Code should know
Anything else — existing conventions, gotchas, past decisions, team preferences?

**Your answer:** Make it amazing.

---

## Once you've answered

1. Save this file.
2. Hand it to Claude Code along with `LOGO_MAKER_SPEC.md` and `CLAUDE.md`.
3. Claude Code will start Phase 0.
