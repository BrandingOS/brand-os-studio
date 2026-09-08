We’ll build this in **12 implementation phases**, each with concrete steps and a completion check. This expands the PRD’s five broad stages into an executable plan.

I checked BrandingOS: the working tree is clean, and I found no existing 3D Logo Studio implementation. **We start at Phase 1; none of the later phases is complete yet.**

The target is the full agreed scope. Completion will be demonstrated through working features, tests, exported files, and visual review.

**Phase 1 — Establish the foundation**

1. Record the existing BrandingOS build, type-check, and test results so unrelated issues are distinguishable.
2. Evaluate the GitHub candidate at a pinned revision: dependencies, licensing, external requests, geometry, and exports.
3. Decide which modules to reuse and which require replacement.
4. Verify compatibility with BrandingOS’s React 18 and Vite setup.
5. Create a requirement checklist connecting every PRD requirement to a phase and acceptance test.

**Complete when:** we have a documented reuse decision, a reproducible development setup, and a baseline for verification.

**Phase 2 — Prove the difficult geometry and rendering**

1. Use your nine-component SVG plus angular, outlined-text, hole-containing, and narrow-bridge examples.
2. Prototype true inflation and compare candidate methods.
3. Prove extrusion and profile-based revolution, including partial sweeps.
4. Render preliminary glass, textured silver, glossy black, and satin black.
5. Produce one image and a basic GLB to check that generated geometry can actually be exported.

Review the full shape and close-ups. Measure processing time and memory on representative devices.

**Complete when:** the chosen approach produces acceptable geometry and convincing reference materials across several logos. If inflation fails here, resolve it before building the complete interface.

**Phase 3 — Integrate the feature into BrandingOS**

1. Create the feature under the proposed folder:
   `/Users/home/Projects/brandingOS/src/features/tools/3d-logo-studio/`.
2. Add the standalone route `/tools/3d-logo-studio`, initially available for development.
3. Compose the existing editor shell and canonical design-system components.
4. Establish the framework-independent document model and operator interfaces.
5. Lazy-load graphics dependencies and implement cleanup when leaving the tool.

Keep heavy assets separate from settings. Keep component IDs, units, coordinate conventions, and operator versions explicit.

**Complete when:** the editor opens without a Brand, follows BrandingOS styling, and can mount/unmount without resource leaks. Unrelated pages do not load its heavy graphics modules.

**Phase 4 — Build reliable SVG import**

1. Validate and sanitize SVG input.
2. Normalize paths, basic shapes, groups, transforms, colors, and supported strokes.
3. Preserve holes, disconnected components, and source placement.
4. Show an import preview with actionable diagnostics.
5. Add cancellation and complexity limits.

The original source remains available for reset and comparison. Unsupported content must never disappear silently.

**Complete when:** your SVG imports as nine distinct components, the supported fixture collection passes, and invalid files fail gracefully.

**Phase 5 — Complete all geometry modes**

1. Finish Flat and Extrude, including depth, alignment, bevels, curve quality, and caps.
2. Turn the successful inflation prototype into a reusable generator with fullness, thickness, smoothness, and outline controls.
3. Complete Revolve with profile selection, axis, pivot, sweep angle, segment quality, and caps.
4. Define component grouping, mesh combination, and actual solid fusion as distinct operations.
5. Validate surfaces, normals, intersections, and holes for each supported operation.

Basic fusion required by the PRD must be qualified here; advanced procedural blob controls remain a later feature.

**Complete when:** all four methods work through the same engine contract, preserve their settings, and report unsupported combinations clearly.

**Phase 6 — Add modifiers, selection, and transforms**

1. Implement ordered Twist, Taper, smoothing, and the supported bevel operations.
2. Add enable/disable, reorder, duplicate, remove, and scoped reset.
3. Add component selection, multiselect, hide/show, lock, group, and ungroup.
4. Implement position, rotation, and scale on X/Y/Z with local/world axes, pivots, snapping, and numeric entry.
5. Connect changes to BrandingOS undo/redo.

Define which modifier sequences are valid. Rapid edits must not allow an older background calculation to overwrite the latest result.

**Complete when:** controls affect the intended components, modifier order is respected, and undo restores geometry and settings accurately.

**Phase 7 — Build the complete material library**

1. Implement the material registry and parameter schemas.
2. Complete the 24 presets specified in the PRD.
3. Add search, categories, favorites, duplication, and custom-material saving.
4. Add texture controls and individual-component assignment.
5. Define each material’s interactive-render, final-render, and GLB-export behavior.

Validate texture scale and seams on curved surfaces. Material changes must preserve geometry and transforms.

**Complete when:** all 24 materials can be applied, edited, saved, restored, and exported with documented fallbacks. The four reference materials also pass visual review.

**Phase 8 — Complete lighting, cameras, and local rendering**

1. Build studio-lighting presets and editable light controls.
2. Separate the visible background from the reflection environment.
3. Add camera presets, perspective/orthographic views, orbit, pan, zoom, and saved views.
4. Implement progressive final rendering with quality settings, progress, and cancellation.
5. Add adaptive preview quality and graphics-context recovery.

Changes to the scene must correctly restart progressive rendering. Glass must be reviewed on both white and black backgrounds.

**Complete when:** composition is predictable, the preview stays usable while editing, and final renders improve consistently as they refine.

**Phase 9 — Finish the editing workflow and local recovery**

1. Complete the Shape, Modifiers, Materials, Lighting, Transform, and Animation panels.
2. Add empty, loading, invalid-input, rendering, and failure states.
3. Implement autosave, refresh recovery, rename, duplicate, delete, and storage-limit handling.
4. Store large assets in browser database storage, with lightweight session references.
5. Finish responsive layouts, keyboard operation, touch interaction, and reduced-motion behavior.

Local recovery requires a versioned internal schema. **The external editable 3D format remains undecided.** Any downloadable backup for this tool must be distinguished from an external application’s native project file.

The existing signup-and-claim flow creates a Brand, so it must not be connected automatically to this standalone tool.

**Complete when:** a user can complete an editing session, refresh, and continue without losing their source, materials, or modeling settings.

**Phase 10 — Implement deterministic animation**

1. Add Spin, Float, Oscillation, Camera Orbit, Turntable, Pulse, Wobble, and Static.
2. Add duration, speed, direction, axis, easing, and loop controls.
3. Evaluate animation at explicit timeline timestamps.
4. Keep animation transforms separate from the user’s base transforms.
5. Test loop boundaries, pause, resume, reset, and procedural texture stability.

**Complete when:** preview and export evaluate the same scene at the same timestamps, regardless of rendering speed.

**Phase 11 — Complete and verify exports**

1. Finish PNG, transparent PNG, and JPEG with aspect-ratio and resolution controls.
2. Implement frame-by-frame animation rendering.
3. Encode supported MP4/WebM configurations and provide image-sequence fallbacks.
4. Export GLB with components, transforms, supported materials, textures, and compatible animation.
5. Add export naming, progress, cancellation, bounded memory use, and useful errors.

Reopen exported images, play exported videos, and validate/reimport GLB files. A successful download alone is insufficient.

For transparent glass, explain that refraction depends on the rendered surroundings; a transparent PNG cannot adapt physically to every later background.

**Complete when:** exports have correct dimensions, framing, duration, materials, and component structure, with no stale or blank frames.

**Phase 12 — Qualify and release the public tool**

1. Test the complete workflow in Chrome, Edge, Firefox, Safari, and representative mobile devices.
2. Exercise low-memory conditions, missing encoders, storage exhaustion, tab backgrounding, and graphics-context loss.
3. Complete accessibility and performance checks.
4. Verify that user logo/project contents remain local.
5. Run the relevant BrandingOS tests, type checks, build, and regression checks.
6. Publish the Tools-directory entry when the feature is ready, then verify the deployed route and rollback procedure.

**Complete when:** the acceptance checklist has evidence for every launch requirement, material defects are resolved, and any supported-device limitations are accurately presented.

**How we’ll manage progress**

Each phase will have:

- A short task checklist with stable identifiers, such as `P7.1`.
- Tests added alongside the functionality.
- A demonstrable result.
- Recorded verification and known limitations.
- A clear status: pending, active, blocked, or complete.

Functional checks run throughout development. Your review is most valuable at the geometry/material proof and the finished visual experience. Routine implementation work can continue without repeated permission requests.

**After the first release**

The later roadmap remains: raster tracing, Brand-linked mode, marching cubes, structural generators, advanced behaviors, and additional materials. Their extension points belong in the foundation; their full interfaces and algorithms do not need to delay the standalone release.

**The immediate next step is Phase 1:** qualify the reusable code and establish the development baseline. The first major proof after that is real inflation and reference-quality materials—not merely an editor with working sliders.