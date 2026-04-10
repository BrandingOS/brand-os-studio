# Variable-Based Template System — Architecture & Study

> Generated: 2026-04-11 | This is the blueprint for BrandOS's core differentiator.

## The Vision

Every design in BrandOS is built with **variables**. Colors, fonts, logos, text — all bound to brand data. When a brand selects a template, it instantly adapts to their identity. No manual work. A marketplace where anyone can create variable-bound templates. Applied everywhere: business cards, social media, brand guidelines, presentations, invoices, mockups.

## How It Works

```
Template Definition (JSON)     Brand Data (from store)
        │                              │
        └──── Variable Resolution ─────┘
                      │
              Resolved Template
                 ╱         ╲
       DOM Renderer     Fabric Renderer
       (previews)       (editor + export)
```

### Variable Types

**Brand Variables** (auto-resolved from Brand object):
- `{{brand.name}}` — brand name
- `{{brand.colors.primary}}` — primary hex color
- `{{brand.colors.secondary}}` — secondary hex color
- `{{brand.colors.primary.light}}` — computed: lighten 20%
- `{{brand.colors.primary.10}}` — computed: 10% opacity
- `{{brand.fonts.primary}}` — primary font family
- `{{brand.fonts.secondary}}` — secondary font family
- `{{brand.logo}}` — primary logo URL
- `{{brand.logo.icon}}` — icon-only logo
- `{{brand.strategy.mission}}` — mission statement
- `{{brand.strategy.values.0}}` — first brand value

**Content Variables** (user-editable per usage):
- `{{content.fullName}}` — e.g., "Jane Smith"
- `{{content.jobTitle}}` — e.g., "Vice President"
- `{{content.headline}}` — e.g., marketing headline
- `{{content.phone}}`, `{{content.email}}`, `{{content.website}}`

### Template Definition Format (JSON)

```json
{
  "id": "bc-classic-clean",
  "version": 1,
  "meta": { "name": "Classic Clean", "type": "business-card", "category": "Minimalist" },
  "canvas": { "width": 1050, "height": 600 },
  "pages": [{
    "id": "front",
    "background": { "type": "solid", "value": "#ffffff" },
    "elements": [
      {
        "id": "logo", "type": "logo",
        "position": { "x": 6, "y": 8 }, "size": { "width": 25, "height": 15 },
        "variant": "full", "src": "{{brand.logo}}"
      },
      {
        "id": "name", "type": "text",
        "position": { "x": 6, "y": 35 }, "size": { "width": 88, "height": 10 },
        "content": "{{content.fullName}}",
        "style": { "fontFamily": "{{brand.fonts.secondary}}", "fontSize": 24, "color": "#1a1a1a" }
      },
      {
        "id": "accent", "type": "shape",
        "position": { "x": 0, "y": 92 }, "size": { "width": 100, "height": 8 },
        "shape": "rect",
        "style": { "fill": "{{brand.colors.primary}}" }
      }
    ]
  }],
  "variables": [
    { "path": "content.fullName", "label": "Full Name", "type": "text", "defaultValue": "Jane Smith", "source": "content" },
    { "path": "content.jobTitle", "label": "Job Title", "type": "text", "defaultValue": "Vice President", "source": "content" }
  ]
}
```

### Resolution Engine

`resolveTemplate(template, brand, contentOverrides)` → Resolved template with all `{{vars}}` replaced.

1. Flatten `Brand` object into variable map (`brand.primaryColor` → `brand.colors.primary`)
2. Compute derived variables (lighten, darken, opacity variants)
3. Merge with content overrides
4. Walk every string in every element and replace `{{path}}`
5. Memoize by `(template.id, brand.id, brand.updatedAt)`

### Rendering

**DOM Renderer** — For previews, gallery cards, html2canvas export
**Fabric Renderer** — For the canvas editor, high-res PNG/SVG/PDF export

Both consume the same `ResolvedTemplate` structure.

### Template Builder (Visual, No Code)

Three-panel layout at `/templates/builder`:
- **Left**: Variables panel (declare content vars) + element library
- **Center**: Fabric.js canvas
- **Right**: Properties panel with "Bind to Variable" toggle on each property

### Marketplace Flow

1. Browse templates → each card renders with YOUR brand via DOM renderer
2. Click "Use" → instant preview with your brand applied
3. Edit content fields (name, title, etc.)
4. Export or open in editor

### Migration Path

Existing 96 templates converted to JSON definitions via conversion scripts. Dual rendering during migration (new system preferred, legacy fallback).

## File Structure

```
src/shared/templates/
  types.ts              — TemplateDefinition, TemplateElement types
  variables/
    schema.ts           — VariablePath types, VariableDefinition
    registry.ts         — Complete brand variable registry
  engine/
    resolve.ts          — Main resolution function
    variableMap.ts      — Brand → flat variable map
    interpolate.ts      — {{var}} string replacement
  renderers/
    DomRenderer.tsx     — ResolvedTemplate → React JSX
    FabricRenderer.ts   — ResolvedTemplate → Fabric objects
  store/
    templateStore.ts    — Zustand store for template CRUD

src/features/templates/
  builder/
    TemplateBuilderPage.tsx
    VariablesPanel.tsx
    BindingPicker.tsx
    PreviewSwitcher.tsx
```

## Implementation Priority

Phase A: Types + Engine (types.ts, resolve.ts, variableMap.ts, interpolate.ts)
Phase B: DOM Renderer + first template conversion
Phase C: Template store + marketplace update
Phase D: Template builder UI
Phase E: Fabric renderer + editor integration
Phase F: Guidelines multi-page templates
Phase G: Full migration of 96 templates
