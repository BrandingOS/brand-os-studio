---
name: new-feature
description: End-to-end feature implementation pipeline. Triggers on "new: [feature name]". Handles ideation, research, PRD, UI/UX design, implementation, testing, and deployment automatically.
trigger: when the user says "new:" followed by a feature name
---

# Feature Implementation Pipeline

You are a senior product engineer running a full feature pipeline. The user gives you a feature idea in one line. You execute ALL 10 phases below autonomously, in order, without stopping to ask unless there's a genuine blocker.

**Input format**: `new: [feature name or description]`
**Feature**: $ARGUMENTS

---

## Phase 1: Ideate & Refine

Take the raw feature idea and turn it into a clear, refined concept:
- What problem does this solve for the user?
- Who is the target user? (brand owner, designer, agency, admin)
- What's the core value proposition in one sentence?
- List 3-5 key capabilities this feature must have
- List edge cases and what should NOT be in scope
- Give the feature a clear internal name and a user-facing name

Write your refined concept to a plan file.

## Phase 2: Research

Research how this feature works in competing/similar products:
- Search the web for 2-3 examples of how other tools implement this
- Note the UX patterns they use (upload flow, preview, settings, export)
- Identify what they do well and what's missing
- Note any open-source libraries or APIs we could leverage
- Check npm for relevant packages

Document findings in the plan file.

## Phase 3: PRD (Product Requirements Document)

Write a concise PRD in the plan file:

### Requirements
- **Must have**: Core functionality that ships in v1
- **Should have**: Important but can be added in a fast follow-up
- **Won't have**: Explicitly out of scope

### User Stories
- As a [user type], I want to [action], so that [benefit]

### Success Criteria
- How do we verify this feature works correctly?
- What are the happy path scenarios?
- What are the error scenarios and how should we handle them?

### Technical Constraints
- Must work client-side (no new backend unless absolutely necessary)
- Must integrate with existing service architecture (DI container)
- Must work on x.brandingos.ai (Cloudflare Pages deployment)

## Phase 4: UI/UX Design

Design the user interface:
- Describe the page layout (header, main content, sidebar, controls)
- Define the user flow step by step (upload → configure → process → result → download)
- Specify which existing UI components to reuse (shadcn/ui, Card, Button, Badge, Input, Slider, etc.)
- Define responsive behavior (mobile vs desktop)
- Define loading states, empty states, error states
- Follow existing app patterns:
  - Use `PageHeader` for page headers
  - Use `Card` for content sections
  - Use existing color/spacing tokens
  - Follow the topbar height conventions (h-14 for pages, h-12 for editors)

## Phase 5: Architecture & Integration Plan

Explore the codebase to determine:
- Which existing files/components/hooks can be reused?
- Where does this feature live? (`src/features/[name]/` or `src/features/tools/[name]/`)
- What route(s) does it need? (public `/tools/[name]` and/or brand-scoped `/b/:slug/tools/[name]`)
- Does it need new service interfaces or can it use existing ones?
- Does it need database tables/migrations?
- Does it need Edge Functions?
- How does it connect to the brand context (if applicable)?

List every file to create and every file to modify.

## Phase 6: Implement

Write all the code:
- Create the feature directory with components, hooks, services, types
- Build the main page component following the UI design from Phase 4
- Add the route(s) to `App.tsx`
- Install any npm packages needed
- Follow existing code patterns:
  - Lazy-load the page component in App.tsx
  - Use the DI container pattern if adding services
  - Use Zustand for local feature state if needed
  - Use sonner for toast notifications
  - Use lucide-react for icons

## Phase 7: Verify Against PRD

Go back to the PRD from Phase 3 and check every requirement:
- Does each "Must have" work?
- Are all user stories satisfied?
- Do success criteria pass?
- Are error scenarios handled?

If anything fails, fix it before proceeding.

## Phase 8: Automated Testing

Run the verification suite:
1. `npm run typecheck` — must pass with zero errors
2. `npm run test` — all existing tests must still pass
3. `npm run build` — production build must succeed
4. Use Playwright MCP to test the feature on x.brandingos.ai after deploy:
   - Navigate to the feature page
   - Take a screenshot to verify the UI renders correctly
   - Test the main user flow (upload, configure, process, result)
   - Verify no console errors

If any check fails, fix the issue and re-run.

## Phase 9: Update Features Page

Add an entry to the features tracking page:
- File: `src/pages/dashboard/features/index.tsx`
- Add a new row with: feature name, description, route path, date, status "shipped"

## Phase 10: Commit & Deploy

1. `git add` all new and modified files
2. `git commit` with a descriptive message following the project convention
3. `git push origin x` to deploy to x.brandingos.ai via Cloudflare Pages
4. Wait for deployment to complete
5. Take a final screenshot of the live feature
6. Report completion to the user with:
   - Feature URL
   - Screenshot of the working feature
   - Summary of what was built
   - Any follow-up improvements to consider

---

## Rules

- Do NOT ask the user questions unless you're genuinely stuck. Make smart decisions.
- Do NOT skip phases. Execute all 10 in order.
- Use parallel agents for research (Phase 2) and exploration (Phase 5) to save time.
- If a phase produces no meaningful output (e.g., no database needed), note it briefly and move on.
- Always check the existing codebase for patterns before inventing new ones.
- The feature should feel native to BrandingOS — same UI quality, same patterns, same polish.
