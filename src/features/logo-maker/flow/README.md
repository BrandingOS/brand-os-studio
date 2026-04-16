# logo-maker/flow — the 6-screen brand creation flow

This folder implements the feature described in `docs/logo-maker/LOGO_MAKER_SPEC.md`:
Mode Select → Brief → Generate → Editor → Brand Kit → Complete.

## Why it's in a subfolder

The existing `src/features/logo-maker/components/*` is the current single-page config-driven logo editor mounted at `/dashboard/logo-maker`. That still works and is untouched.

The `flow/` subfolder is the new Fabric.js-based 6-screen flow mounted at `/logo-maker/*`. It will absorb or replace the existing editor in Phase 4.

See `docs/logo-maker/ADR-0001-scaffold.md` for the full reasoning.

## Phase status

- Phase 0 (scaffold): done — placeholders only
- Phase 1 (Mode Select + Brief): pending
- Phase 2+: see spec §7
