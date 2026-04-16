# Mockup generator service

Renders a brand's logo + colors into the 12 mockup templates specified in
spec §3.2, Screen 5.

Per Hamza (Q10): "Build all 12 as specced AND make adding new mockups easy."
So the template registry is a pluggable list — one file per mockup, each
exports `{ id, label, render(brandContext) }`. Adding a 13th mockup is a
single file, no core changes.

## Phase 0

Folder reserved — real templates arrive in Phase 6.
