Questions for Hamza â€” Answer before Phase 0
Claude Code needs these answers before it starts. Fill in each one, commit the file back, and Claude Code will proceed.

1. Auth provider
Which auth system do you want?
* Clerk (recommended for speed)
* Supabase Auth (Yes, using Supabase for login, nad integration with google and facebook login)
* Custom (NextAuth-style)
* Already using something in brand-os-studio â€” tell us what: _____________
Your answer: Supabase Auth (Yes, using Supabase for login, nad integration with google and facebook login)

2. Pricing model
The spec defaults to Free / Pro / Team with these rate limits:
* Free: 3 logo generations/day
* Pro: 50/day
* Team: unlimited
Is that right? If not, give us the limits you want:
Your answer: Free: 3 logo generations/day / Unlimeted for premium users

3. Existing design tokens
Does brand-os-studio already have a Tailwind config or a design system?
* Yes â€” link to the config file: _____________
* No â€” create a new one following the spec
Your answer: yes, check for it in codebase

4. Claude API key
* I have an existing Anthropic org account â€” I'll provide the key as an env var
* Set up a new account â€” tell me the steps
* Use existing one from another BrandingOS pipeline
Your answer: I already do inside claude

5. Gemini API key
Same question for Gemini 3 Pro Image (Nano Banana).
* I have the key
* Using the existing nanobanana skill setup
* Need to provision
Your answer: Ask me if you need ! I don’t have API Or paid until now!

6. API domain
Where should the backend live?
* api.brandingos.ai (subdomain)
* brandingos.ai/api (path-based)
* Separate Cloudflare Worker with its own domain: _____________
Your answer: Exist, in codebase

7. Analytics
Which analytics tool do you want me to wire events to?
* PostHog
* Plausible
* Mixpanel
* Google Analytics
* None for v1 â€” add later
* Already using: _____________
Your answer: Google Analytics, google clarity, 

8. Cloudflare resources
* D1 database: [ ] already provisioned (name: ______) / [ ] create new
* R2 bucket: [ ] already provisioned (name: ______) / [ ] create new
* Workers: [ ] existing Worker project / [ ] create new
Your answer:already exist, in codebase

9. Existing Brand schema
If BrandingOS already has a "Brand" entity anywhere in the codebase, link it so we can align â€” we don't want two competing Brand schemas.
Your answer: already exist, in codebase. check for it and see how to mix 

10. Scope for v1
The spec lists 12 mockup templates (business card, t-shirt, etc.). That's a lot to build. For v1, should we:
* Build all 12 as specced
* Start with 4 (business card, t-shirt, mobile icon, Instagram post) and add more later
* Different subset: _____________
Your answer: Build all 12 as specced , and add very creative option to make it easy and simple to make many more 

11. Integration priorities
On Screen 6 ("Brand Registered"), the spec shows 4 next-step CTAs: Landing Page, Social Posts, Video Ads, Invite Team. Which of these actually exist as features today?
* Landing Page Generator â€” exists / stub it
* Social Content â€” exists / stub it
* Video Ads â€” exists / stub it
* Invite Team â€” exists / stub it
Your answer:I don’t really know ! check for it. !

12. Any other context Claude Code should know
Anything else â€” existing conventions, gotchas, past decisions, team preferences?
Your answer: Make it amazing

Once you've answered
1. Save this file.
2. Hand it to Claude Code along with LOGO_MAKER_SPEC.md and CLAUDE.md.
3. Claude Code will start Phase 0.
