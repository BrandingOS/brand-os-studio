# BrandOS User Flows

> Personas, user stories, and end-to-end flows. Every architectural decision in
> `ARCHITECTURE.md` must serve at least one of these.

---

## 1. Personas

### P1 — Maya, the solo founder
- Building one brand for her new business. Doesn't know what "brand voice" means.
- Goal: get a logo, colors, and a one-pager she can send to a freelance designer.
- Pain today: gets dropped into a 19-item sidebar and bounces.

### P2 — Daniel, the in-house designer
- Owns 1–2 brands deeply. Lives in the editor.
- Goal: refine assets, generate variations, export print-ready files.
- Pain today: each editor feels different. Has to relearn shortcuts every time.

### P3 — Priya, the agency lead
- Switches between 8–15 client brands per week.
- Goal: brand isolation, fast switching, no accidental cross-contamination.
- Pain today: brand context is implicit; no clear switcher; once she's deep in a brand she has to climb back out to dashboard to switch.

### P4 — Tomás, the small-business owner
- Wants outputs (cards, social posts, a brand book PDF). Doesn't want to *learn* anything.
- Goal: pick template → answer 3 questions → download.
- Pain today: there are 4 ways to start something, none of them obviously the right one.

### P5 — Sam, the power user
- Tweaks every variant, every shade, every kerning option. Knows the product cold.
- Goal: deep control, undo/redo, keyboard shortcuts, batch operations.
- Pain today: Design Editor has shortcuts, Guidelines doesn't, BrandKit canvas doesn't, Brand Edit doesn't.

### P6 — Jordan, the invited collaborator
- Was invited to one brand. Doesn't have access to anyone else's stuff.
- Goal: open the brand, do their part, leave.
- Pain today: this user type doesn't exist yet — but the architecture must not block it.

### P7 — Riley, the returning user
- Came back after 2 weeks. Forgot what they were doing.
- Goal: pick up where they left off.
- Pain today: there's no "Continue" surface. Lands on the same dashboard as a brand-new user.

### P8 — Quinn, the brand-curious newcomer
- Word "brand" makes them think of "logo". Confused by "brandkit", "guidelines", "identity".
- Goal: just want to see what this thing does.
- Pain today: vocabulary gates them out before they ever try anything.

---

## 2. User Stories (prioritized)

### Must-have (P0)
- **US1** As Maya, I can create a brand in under 3 minutes, with no required reading.
- **US2** As Maya, after I make a logo, I see "Save to brand" and the next step is obvious.
- **US3** As Priya, I can switch between brands from anywhere in two clicks max.
- **US4** As Tomás, I can pick a template, answer minimal questions, and download.
- **US5** As Riley, when I open BrandOS I see "Continue editing X" front and center.
- **US6** As any user, every link in the sidebar leads to a working page.

### Should-have (P1)
- **US7** As Daniel, every editor uses the same toolbar layout and `⌘S` saves.
- **US8** As Sam, my undo history works in every editor and survives navigation.
- **US9** As Quinn, the language is approachable: "your logo", "your colors", not "asset library".
- **US10** As Maya, the brand creation flow guides me — it doesn't drop me into a blank page.

### Nice-to-have (P2)
- **US11** As Jordan, when I'm invited to a brand I see only that brand and only the sections I'm allowed in.
- **US12** As Priya, I can mark brands as favorite and they pin to the top.
- **US13** As Sam, I can navigate the entire app without touching the mouse.

---

## 3. Flows

### F1 — First-run: Maya creates her first brand
```
Land on /  →  empty state: "Let's make your first brand"  →  click [Start]
   →  /create-brand (FocusPage)
       Step 1: name + industry  (1 input, 1 dropdown)
       Step 2: pick a vibe      (6 visual presets)
       Step 3: pick or generate a logo  → option to open Logo Lab
   →  /b/:slug/identity   (drops her in Identity > Logo, with the generated logo loaded)
   →  side panel suggests: "Next: pick your colors"  (progressive disclosure)
```

**What this kills:** the current onboarding wizard that doesn't connect to the dashboard,
and the dead-end Logo Maker that produces a download with no destination.

### F2 — Daniel edits a business card
```
On /b/acme  →  click Assets → Print  →  click "Business Card"
   →  /b/acme/assets/print/business-card  (asset list with templates)
   →  click [+ New from template] → pick template
   →  /b/acme/assets/print/business-card/:docId  (EditorShell)
       Top bar: ← Acme · Assets · Print · Business Card · "Untitled"   ● Saved
       Left rail: Layers · Elements · Brand colors
       Right panel: properties
   →  edit, ⌘S (no-op, auto-save)  →  Export ▾ → PNG / PDF
```

### F3 — Priya switches brands
```
Inside /b/acme/assets  →  click brand name in topbar
   →  dropdown: searchable list of all brands, recent first
   →  click "Globex"
   →  navigates to /b/globex/assets   (preserves the section the user was in!)
```

**Section preservation** is the crucial UX detail: switching brands keeps the user in "Assets",
not bounces them back to Overview.

### F4 — Tomás makes a brand book PDF in 4 clicks
```
Workspace home  →  "Continue" or "Brands"  →  click brand
   →  Brand overview shows progress: "Your brand is 70% complete. [Generate brand book]"
   →  click [Generate brand book]
   →  /b/:slug/guidelines  (auto-fills from Identity, opens preview)
   →  [Export PDF]
```

### F5 — Sam deep-edits a logo
```
/b/acme/identity → Logo tab → "Open Logo Lab"
   →  /b/acme/identity/logo/lab  (EditorShell with logo-specific tools)
       Same top bar, same rail pattern, same ⌘S, same undo
   →  iterate, save, return to /b/acme/identity/logo with the new variant added
```

### F6 — Riley returns
```
/  →  workspace home
   First section, before brands grid:
   ┌─ Continue ────────────────────────────┐
   │ Acme · Assets · Business Card        │
   │ Edited 6h ago                        │
   │ [Resume]                             │
   └──────────────────────────────────────┘
```

A single click takes Riley back to the exact editor they were in, with the document hydrated.

### F7 — Quinn explores
```
/  →  empty state  →  "I'm not sure where to start"  →  /learn
   →  Learn hub: 4 lessons, 5 examples, "what is brand identity"
   →  Each example brand is openable in read-only mode
```

Quinn never hits a 19-item submenu. They get a curated path.

### F8 — Brand creation (the wizard)
```
F1 step 1: name + industry
F1 step 2: vibe
F1 step 3: logo (3 paths)
   a) Pick from 12 generated options (AI-driven, fast)
   b) Upload my own
   c) Open Logo Lab (full editor)
F1 step 4: colors (3 palettes generated from logo)
F1 step 5: typography (3 pairings suggested)
F1 step 6: done — drop in Identity with everything filled
```

Steps are skippable; defaults are sensible. The wizard is in `FocusPage` mode.

### F9 — Export flow
```
Any editor → top bar [Share ▾]
   →  Export current asset as PNG / SVG / PDF
   →  Open Share section for full options (links, public showcase, batch export)
```

The Share section is the central place; the editor button is the shortcut.

### F10 — Brand switching context preservation
```
Section the user is in    →    after brand switch    →    new URL
─────────────────────────────────────────────────────────────────
/b/acme                        /b/globex             (overview → overview)
/b/acme/identity               /b/globex/identity    (identity → identity)
/b/acme/identity/logo          /b/globex/identity    (sub-tab default if missing)
/b/acme/assets/social          /b/globex/assets/social
/b/acme/assets/social/post/123 /b/globex/assets/social   (specific doc → list)
```

Rule: preserve the section, fall back to the section's home if the leaf doesn't exist in the
new brand.

---

## 4. Anti-patterns explicitly forbidden

These are things the current product does that we won't do again.

- ❌ A sidebar item that points to a NotFound route
- ❌ Two routes for the same concept (`/dashboard/brand/:slug/brand-guides` and `/dashboard/brand/:slug/guidelines`)
- ❌ A tool with no destination for its output (Logo Maker today)
- ❌ A page where the user has to scroll past 19 nav items to find what they want
- ❌ Different layouts for the "same" page when navigated from different entry points
- ❌ Save semantics that vary by editor (some auto, some manual, some never)
- ❌ Brand context that's invisible in the topbar
- ❌ Onboarding that doesn't connect to the place you land afterwards

---

## 5. Validation: do the personas survive the architecture?

| Persona | First-run | Returns | Switches brands | Does deep work | Survives? |
|---|---|---|---|---|---|
| Maya P1 | F1, F8 | F6 | n/a | F5 | ✅ |
| Daniel P2 | n/a | F6 | F3 | F2 | ✅ |
| Priya P3 | n/a | F6 | F3, F10 | F2 | ✅ |
| Tomás P4 | F1 | F6 | F3 | F4 | ✅ |
| Sam P5 | n/a | F6 | F3 | F2, F5 | ✅ |
| Jordan P6 | invite link | scoped F6 | n/a | F2 (scoped) | ✅ (when permissions land) |
| Riley P7 | n/a | F6 | F3 | continues prior | ✅ |
| Quinn P8 | F7 | F7 | n/a | n/a | ✅ |

The new architecture serves all 8 personas. The current architecture serves Daniel and Sam
(the power users) and quietly fails Maya, Tomás, Riley, and Quinn (the majority).
