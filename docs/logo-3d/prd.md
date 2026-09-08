# BrandingOS 3D Logo Studio — Product Requirements Document

**Version:** 1.0  
**Status:** Approved scope for implementation  
**Product location:** BrandingOS Tools  
**Initial mode:** Standalone public tool  
**Planned route:** `/tools/3d-logo-studio`

## 1. Product vision

BrandingOS 3D Logo Studio is a browser-based tool that transforms uploaded SVG logos into customizable 3D objects.

Users can create faithful 3D versions of their logos or deliberately reinterpret them using inflation, extrusion, revolution, twist, taper, materials, lighting, camera controls, and animation.

The tool will be part of BrandingOS, but the first release will work independently without requiring a Brand. Future versions can connect directly to a BrandingOS Brand and use its logos, colors, assets, and storage.

## 2. Core user journey

1. Open 3D Logo Studio from BrandingOS Tools.
2. Upload an SVG logo.
3. Inspect the detected logo components.
4. Choose a geometry method.
5. Adjust depth, shape, modifiers, and transforms.
6. Select or customize materials.
7. Adjust lighting, background, camera, and composition.
8. Add animation if desired.
9. Export an image, animation, GLB model, or project backup.

The application must always preserve the original uploaded source so users can reset or change the modeling method without uploading again.

## 3. Initial product mode

The first release is a standalone BrandingOS tool:

- No Brand selection is required.
- No active Brand is required.
- Processing happens locally in the browser.
- Projects are recovered from browser storage.
- Users can download project backups.
- The tool appears in the existing BrandingOS Tools directory.
- The interface uses BrandingOS navigation, editor chrome, design system, and accessibility patterns.

Future Brand mode may provide:

- Importing logos directly from a Brand.
- Applying Brand colors automatically.
- Saving projects into Brand assets.
- Reusing materials across Brand projects.
- Exporting renders directly into the Brand library.

These integrations must use optional adapters so the standalone engine does not depend on Brand data.

## 4. Input formats

### First release

SVG is the required input format.

The importer must support:

- Closed filled paths.
- Multiple disconnected components.
- Compound paths and holes.
- Nested SVG groups and transforms.
- Solid colors.
- Common SVG shapes converted to paths.
- Common strokes converted into outlines.
- Both common SVG fill rules.

The importer must detect and explain:

- Live text that has not been converted to paths.
- Embedded raster images.
- Unsupported masks, filters, patterns, or external assets.
- Broken or self-intersecting paths.
- Excessively detailed files.
- Unsafe scripts, event handlers, or external references.

Unsupported features must never disappear silently.

### Future release

PNG, JPG, and WebP uploads will be traced into editable vector paths before entering the 3D pipeline.

The tracing flow will include:

- Crop and background selection.
- Monochrome or color tracing.
- Color-count adjustment.
- Threshold and noise removal.
- Curve smoothing and simplification.
- Original-versus-trace comparison.
- SVG download.
- Approval before generating the 3D model.

Raster tracing is an approximation and cannot guarantee recovery of the original vector artwork.

## 5. Supplied SVG

The supplied `Logomark-3d.svg` contains nine separate closed circular paths inside a `113 × 113` viewBox.

The application must:

- Detect nine separate components.
- Preserve their positions and proportions.
- Keep the components separate by default.
- Allow individual or grouped selection.
- Avoid adding connections automatically.
- Allow future explicit merging through blob or marching-cubes operations.

This SVG differs from the connected organic shape shown in the visual references. The SVG is the real import fixture; the supplied images remain material, geometry, lighting, and rendering references.

## 6. Geometry modes

### Flat

Creates a planar surface from the logo.

Controls:

- Front and back visibility.
- Surface orientation.
- Face material.
- Optional minimal thickness.

Flat geometry may remain an open surface. Users requiring a solid object must use Extrude or Inflate.

### Extrude

Creates a solid object by extending the SVG outline.

Controls:

- Depth.
- Front, center, or back alignment.
- Bevel size.
- Bevel depth.
- Bevel profile.
- Bevel segments.
- Curve quality.
- Front and back caps.
- Separate or combined component processing.

### Inflate

Creates the soft, rounded, swollen geometry represented in the supplied references.

Controls:

- Fullness.
- Thickness/depth.
- Smoothness.
- Front-versus-back balance.
- Outline preservation.
- Edge softness.
- Surface quality.
- Separate or fused component behavior.

Inflation must be treated as real geometry generation, rather than a large extrusion bevel.

The implementation must be tested against:

- Rounded logos.
- Angular logos.
- Narrow bridges.
- Small gaps.
- Compound paths.
- Wordmarks converted to outlines.
- Multiple separated elements.

### Revolve

Creates geometry by revolving a selected profile around an axis.

Controls:

- Profile or component selection.
- X, Y, Z, or custom axis.
- Pivot and axis offset.
- Full or partial revolution angle.
- Number of radial segments.
- Start and end caps.
- Profile preview.

Revolve is a creative operation and may substantially change the logo silhouette. The interface must communicate this before applying it.

## 7. Modifier system

Geometry must use a non-destructive, ordered modifier stack.

### Initial modifiers

- Bevel.
- Twist.
- Taper.
- Surface smoothing.
- Normal correction.
- Optional component separation or combination.

### Twist controls

- Angle in degrees.
- X, Y, Z, or custom axis.
- Pivot.
- Start and end positions.
- Falloff.
- Component or group scope.

### Taper controls

- Start scale.
- End scale.
- X, Y, Z, or custom axis.
- Pivot.
- Affected interval.
- Falloff.
- Component or group scope.

Modifiers can be:

- Enabled or disabled.
- Reordered.
- Duplicated.
- Removed.
- Reset individually.
- Reset as a group.

Changing modifier order may change the result and must be preserved in saved projects.

## 8. Transform controls

The tool must support:

- Position X, Y, and Z.
- Rotation X, Y, and Z.
- Uniform scale.
- Independent X, Y, and Z scale.
- Local and world axes.
- Center, origin, and custom pivots.
- Numeric entry.
- Sliders.
- Viewport manipulation controls.
- Snapping.
- Fit to view.
- Reset position.
- Reset rotation.
- Reset scale.
- Reset all transforms.

Camera movement and object rotation must remain separate so animations and exports are predictable.

## 9. Component editing

Each detected SVG component must receive a stable identifier.

Users can:

- Select one or multiple components.
- Hide or show components.
- Lock components.
- Apply different materials.
- Apply different depth or modifiers where supported.
- Transform individual components.
- Group and ungroup components.
- Restore original placement.

Separate components must remain separate unless the user explicitly combines them.

## 10. Materials

The material system must be registry-based so new materials can be added without changing the editor itself.

### Launch target

At least 24 curated presets across these families:

**Metals**

- Polished chrome.
- Brushed aluminum.
- Textured silver.
- Gold.
- Copper.
- Titanium.

**Glass**

- Clear glass.
- Frosted glass.
- Smoked glass.
- Tinted glass.

**Coatings and synthetics**

- Glossy black lacquer.
- Satin black.
- Glazed ceramic.
- Matte ceramic.
- Enamel.
- Glossy plastic.
- Matte plastic.
- Rubber.

**Natural and textured**

- Clay.
- Concrete.
- Marble.
- Wood.

**Effects**

- Pearlescent.
- Emissive.

### Material controls

Controls are shown only when relevant:

- Base color.
- Metalness.
- Roughness.
- Transmission.
- Refraction index.
- Thickness.
- Tint and attenuation.
- Clearcoat.
- Emission.
- Anisotropy.
- Iridescence.
- Texture scale.
- Texture rotation.
- Texture position.
- Normal or bump strength.

Users can:

- Search and filter materials.
- Mark favorites.
- Duplicate presets.
- Save custom materials.
- Reset to the original preset.
- Assign materials to selected components.

Clear glass, textured silver, glossy black, and satin black are the first visual-quality benchmarks based on the supplied references.

## 11. Lighting and composition

Lighting presets:

- White studio.
- Black studio.
- Neutral studio.
- Soft product lighting.
- Dramatic rim lighting.
- High-contrast reflective lighting.

Controls:

- Environment rotation.
- Environment intensity.
- Key light position, size, color, and intensity.
- Fill light.
- Rim light.
- Ground shadow.
- Background color.
- Transparent background.
- Reflection environment independent from the visible background.

Camera presets:

- Front.
- Three-quarter.
- Side.
- Top.
- Macro close-up.
- User-defined views.

Camera controls:

- Orbit.
- Pan.
- Zoom.
- Field of view.
- Orthographic or perspective mode.
- Target position.
- Fit to object.
- Save custom view.

## 12. Rendering

The application uses two browser rendering modes.

### Interactive preview

Used while editing:

- Fast response.
- Adaptive quality.
- Immediate material and transform feedback.
- Reduced quality while the camera or object is moving.
- Automatic quality restoration when interaction stops.

### Final local render

Used for still and animation exports:

- Progressive refinement.
- User-selectable quality.
- Sample progress.
- Time estimate after sufficient progress.
- Pause and cancellation where supported.
- Tiled rendering for large outputs.
- Recovery from graphics-context failure where possible.

All logo processing and rendering remains on the user’s device.

The application must never silently upload logos, geometry, renders, or projects to an external service.

## 13. Animation

Initial animation presets:

- Spin.
- Gentle float.
- Oscillation.
- Camera orbit.
- Turntable.
- Pulse.
- Wobble.
- Static.

Controls:

- Duration.
- Frame rate.
- Resolution.
- Direction.
- Speed.
- Loop.
- Start and end rotation.
- Animation axis.
- Ease.
- Background.
- Render quality.

Animation rendering must use fixed timeline timestamps so export speed does not affect animation timing.

Initial target:

- 1080p.
- 30 fps.
- Five-second animation.
- MP4 when supported.
- WebM fallback.
- PNG image-sequence fallback.
- Transparent PNG sequences.

Transparent MP4 is not promised.

## 14. Export formats

### Images

- PNG.
- Transparent PNG.
- JPEG.
- 1:1, 4:5, 16:9, and custom ratios.
- Custom pixel dimensions.
- Proposed maximum long edge of 4096 pixels, subject to browser capability.

### Animation

- MP4 where supported.
- WebM fallback.
- PNG sequence.
- Configurable frame rate, duration, and resolution.

### 3D

GLB is the confirmed interchange format.

GLB exports should preserve where supported:

- Geometry.
- Separate components.
- Basic materials.
- Textures.
- Object transforms.
- Compatible animation channels.

Advanced browser materials may not appear identically in every external 3D application. Export-compatible fallbacks must be documented.

The external editable project format remains undecided until the target 3D application is confirmed.

### Project backup

A versioned BrandingOS 3D Studio project archive will preserve the complete procedural scene for reopening inside this tool.

This internal archive is separate from the undecided external editable 3D format.

It contains:

- Original SVG.
- Normalized vector data.
- Components.
- Geometry method.
- Ordered modifiers.
- Materials and textures.
- Lighting.
- Camera.
- Animation.
- Export settings.
- Engine and schema versions.

## 15. Standalone persistence

The existing BrandingOS lightweight tool session system can store small settings and session identity.

Large project data must use browser database storage because localStorage is unsuitable for large textures and meshes.

Required behavior:

- Autosave.
- Restore after refresh.
- Rename project.
- Duplicate project.
- Delete project.
- Display storage usage.
- Handle storage limits.
- Download a backup.
- Import a backup.
- Never delete downloaded exports when deleting a local project.

## 16. BrandingOS integration

The feature belongs under:

`src/features/tools/3d-logo-studio/`

Proposed internal structure:

- `engine/` — pure TypeScript document, geometry, modifier, and validation logic.
- `render/` — browser graphics, previews, path tracing, and render workers.
- `materials/` — material models, presets, and textures.
- `animation/` — deterministic animation and future behaviors.
- `export/` — PNG, video, GLB, and project archive exports.
- `storage/` — browser project storage and migrations.
- `components/` — feature-specific BrandingOS interface.
- `workers/` — heavy geometry and rendering operations.
- `naming/` — all export filename rules.
- `index.ts` — public feature exports.

The tool must:

- Register in the BrandingOS tool registry.
- Appear in the public Tools directory.
- Use the existing BrandingOS tool shell.
- Use the canonical BrandingOS design system.
- Use the shared undo/redo registry.
- Lazy-load large 3D, rendering, and encoding modules.
- Keep React and browser APIs out of the pure engine.
- Ship its own renderer and exporters.
- Avoid modifying the frozen BrandingOS editable-export system.
- Avoid depending on an active Brand.
- Support multiple isolated editor instances.
- Release GPU, worker, and event resources on unmount.

## 17. GitHub code reuse

The first repository to evaluate is:

[renatoworks/3dsvg](https://github.com/renatoworks/3dsvg)

Potentially reusable areas:

- SVG-to-extrusion logic.
- Three.js scene setup.
- Material starting points.
- Camera interaction.
- Image export.
- Animation capture.
- GLB and other model-export logic.

It must not be copied as a complete external application because its application structure differs from BrandingOS.

Before adoption:

1. Pin an exact commit.
2. Verify its license and dependency licenses.
3. Run its build and tests.
4. Audit external network calls and bundled assets.
5. Test the supplied SVG.
6. Validate component preservation.
7. Validate video timing and memory.
8. Reimport exported GLB.
9. Implement one new modifier through the proposed architecture.
10. Compare adaptation effort with using Three.js directly.

If adaptation creates more complexity than it saves, retain only useful algorithms and build the BrandingOS feature around Three.js.

## 18. Browser support

Supported targets:

- Current and previous stable Chrome.
- Current and previous stable Edge.
- Current and previous stable Firefox.
- Current and previous stable Safari.
- Current mobile Safari.
- Current Android Chrome.

Advanced rendering and video export depend on device graphics, memory, and encoder availability.

The tool must:

- Detect capabilities before starting expensive work.
- Offer appropriate output fallbacks.
- Lower preview quality on weaker devices.
- Explain unsupported configurations.
- Preserve user work after recoverable failures.
- Never display an empty successful result.

## 19. Accessibility

Required:

- Keyboard-accessible controls.
- Visible focus indicators.
- Labeled sliders and inputs.
- Numeric alternatives to drag controls.
- Adequate contrast.
- Reduced-motion support.
- No mandatory automatic rotation.
- Touch-accessible viewport controls.
- Status announcements for loading, rendering, and failures.

## 20. Future architecture

The following requested features are recorded for later releases:

### Marching cubes and blobs

- `numBlobs`
- `resolution`
- `isolation`
- `cornerStrength1`
- `cornerStrength2`
- `lineStrength1`
- `lineStrength2`

### Structural build controls

- `distance`
- `tetraHeight`
- `tetraRadius`
- `linePadding1`
- `segmentRotationX`
- `segmentRotationY`
- `segmentRotationZ`

### Behaviors

- `followMouse`
- `mouseSensitivity`
- `ease`
- `drift`
- `driftSpeed`
- `driftIntensity`

### Commands

- Reset.
- Collapse.
- Spin.

Reset and standard Spin belong in the initial release.

The meaning of Collapse and the exact field/build formulas must be confirmed when those modules are prioritized.

Future behaviors must work with mouse, touch, reduced motion, and deterministic animation export.

Topology-changing blob animations may require baked frame sequences or another cache format. They cannot automatically be promised as ordinary animated GLB files.

## 21. Acceptance criteria

The first public release is ready when:

- Supported SVG fixtures import correctly.
- The supplied SVG produces nine preserved components.
- Flat, Extrude, Inflate, and Revolve work with documented constraints.
- Twist and Taper work on all supported axes.
- All transforms save and restore correctly.
- The agreed launch materials load, edit, and export.
- The four reference materials pass visual review.
- Browser project recovery works.
- Undo and redo cover modeling and material changes.
- PNG, video fallback, and GLB exports work.
- Exported GLB successfully reimports into a standard validator/viewer.
- Unsupported SVG and device conditions produce clear guidance.
- Browser/device qualification passes.
- Uploaded logo and project data remain local.
- BrandingOS design-system and accessibility requirements pass.
- The tool can mount and unmount without leaking browser or GPU resources.

## 22. Implementation phases

### Phase 1 — Foundation evaluation

- Evaluate and pin reusable GitHub code.
- Add the BrandingOS feature boundary.
- Build the pure project document schema.
- Register the standalone route and metadata.
- Verify lazy loading.
- Import the supplied SVG.
- Establish browser capability reporting.

### Phase 2 — Geometry proof

- Component detection and selection.
- Flat.
- Extrude.
- Inflate.
- Revolve.
- Twist.
- Taper.
- Complete transforms.
- Source-outline comparison.

This phase must prove geometry quality before the whole editor is completed.

### Phase 3 — Visual editor

- BrandingOS tool shell.
- Shape and modifier panels.
- Material library.
- Lighting and camera.
- History.
- Local project storage.
- Responsive desktop and mobile interface.

### Phase 4 — Exports

- High-resolution still images.
- Deterministic animations.
- MP4/WebM/image-sequence fallbacks.
- GLB.
- Project archive.
- Progress, cancellation, and recovery.

### Phase 5 — Public qualification

- Browser and device testing.
- Accessibility.
- Invalid and unsafe input testing.
- Storage and graphics-context recovery.
- Performance tuning.
- License and asset audit.
- Public Tools-directory integration.

### Later phases

- PNG/JPG tracing integration.
- Brand-linked mode.
- Marching cubes.
- Blob connections.
- Structural generators.
- Advanced behaviors.
- Expanded materials.
- External editable 3D format after the target application is known.

## 23. Final decisions

Confirmed:

- The product is a BrandingOS Tool.
- The first release is standalone.
- It is publicly accessible.
- SVG is the initial input.
- PNG/JPG tracing is planned for later.
- Processing and rendering happen in the browser.
- Geometry includes Flat, Extrude, Inflate, and Revolve.
- Modifiers include Twist and Taper.
- Full X/Y/Z transforms are required.
- The material system must be broad and extensible.
- Images, animations, and 3D models are required.
- GLB is the interchange format.
- Suitable open-source code can be reused after evaluation.
- Future Brand integration must not require rewriting the engine.

Open without blocking initial implementation:

- The target external 3D application.
- Its native editable project format.
- Future BrandingOS Brand storage contract.
- Exact formulas for Collapse, blob strengths, and structural controls.

No additional product decision is required to start Phase 1.