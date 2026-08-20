#!/usr/bin/env bash
#
# Generates the browser/app icon set for BOTH apps from the ONE official
# BrandingOS logomark. The artwork is never redrawn here — this script only
# rasterizes, recolours and composites `SRC`.
#
#   npm run gen:icons
#
# Outputs (identical in `public/` and `landingpage/public/`):
#
#   favicon.svg            ink only, transparent, adapts to the browser theme
#   favicon.ico            16·32·48, charcoal tile — the legacy fallback
#   icon-192.png           charcoal tile
#   icon-512.png           charcoal tile
#   icon-maskable-512.png  charcoal, mark inset for Android's circular mask
#   apple-touch-icon.png   180, charcoal tile (iOS composites on black anyway)
#   site.webmanifest       name + the icon list
#
# The two `public/` trees are written IDENTICALLY on purpose. Both builds emit
# into one `dist/` (scripts/build-landing.mjs) and the landing goes second, so
# any file that differed between them would be silently overwritten by the
# landing's copy. Identical files make that collision a no-op.
#
# WHY the raster icons carry a tile and the SVG does not: only the SVG can ask
# the browser which theme it is being drawn on. A transparent charcoal mark
# vanishes on a dark tab strip, so every format that CANNOT adapt gets the
# brand's own inverted surface instead and reads on either.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/landingpage/src/assets/brand/logo-icon.svg"
CONVERT="${IMAGEMAGICK_CONVERT:-$(command -v magick || command -v convert || echo /opt/ImageMagick/bin/convert)}"

# --ds-accent, both modes (src/shared/ds/tokens.css). The mark has exactly one
# colour and it is this token — same as <BrandMark>.
INK_LIGHT="#111113"
INK_DARK="#f5f4f0"
TILE="$INK_LIGHT"   # the inverted surface: charcoal ground, warm-white mark

[ -f "$SRC" ] || { echo "missing source mark: $SRC" >&2; exit 1; }
command -v "$CONVERT" >/dev/null 2>&1 || [ -x "$CONVERT" ] || {
  echo "ImageMagick not found (set IMAGEMAGICK_CONVERT)" >&2; exit 1; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# ImageMagick stamps every PNG with tIME + date:create/date:modify, so two runs
# a second apart produce different bytes for identical pixels. That would make
# the two public/ trees differ (see above) and churn the diff on every
# regeneration. Strip them; the image is unchanged.
DETERMINISTIC="-define png:exclude-chunk=time,date +set date:create +set date:modify +set date:timestamp"

# Rasterize the mark at `$2` px, inked `$3`, on transparent → $1
mark() {
  "$CONVERT" -background none -density 1600 "$SRC" \
    -resize "${2}x${2}" -fill "$3" -colorize 100 "PNG32:$1" 2>/dev/null
}

# A square tile of `$2` px with the mark occupying `$3`% of it → $1
tile() {
  local out="$1" size="$2" pct="$3"
  local inner=$(( size * pct / 100 ))
  mark "$TMP/m.png" "$inner" "$INK_DARK"
  "$CONVERT" -size "${size}x${size}" "xc:$TILE" \
    "$TMP/m.png" -gravity center -composite \
    -background "$TILE" -alpha remove -alpha off \
    $DETERMINISTIC "PNG32:$out" 2>/dev/null
}

emit() {
  local dir="$1"
  mkdir -p "$dir"

  # ── favicon.svg — the only format that can answer the browser's theme ──
  #
  # The nine paths below are `logo-icon.svg` VERBATIM. The <style> block adds
  # colour, which the source leaves unset; it changes nothing about the shape.
  {
    printf '%s\n' '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 113.01 113.01">'
    printf '%s\n' '  <title>BrandingOS</title>'
    printf '%s\n' '  <style>'
    printf '%s\n' "    :root { fill: $INK_LIGHT }"
    printf '%s\n' "    @media (prefers-color-scheme: dark) { :root { fill: $INK_DARK } }"
    printf '%s\n' '  </style>'
    sed -n '/<g id="Logomark">/,/<\/g>/p' "$SRC" | sed 's/^      /  /;s/^    //'
    printf '%s\n' '</svg>'
  } > "$dir/favicon.svg"

  # ── raster fallbacks ──
  tile "$TMP/ico16.png" 16  88
  tile "$TMP/ico32.png" 32  84
  tile "$TMP/ico48.png" 48  82
  "$CONVERT" "$TMP/ico16.png" "$TMP/ico32.png" "$TMP/ico48.png" "$dir/favicon.ico" 2>/dev/null

  tile "$dir/icon-192.png"        192 78
  tile "$dir/icon-512.png"        512 78
  tile "$dir/apple-touch-icon.png" 180 62   # iOS rounds the corners itself
  tile "$dir/icon-maskable-512.png" 512 52  # Android's circular safe zone

  # ── manifest ──
  #
  # `display: browser` keeps this an ICON manifest: it declares what the app is
  # called and what it looks like without also making the site installable,
  # which would be a behaviour change rather than a branding one.
  cat > "$dir/site.webmanifest" <<'JSON'
{
  "name": "BrandingOS",
  "short_name": "BrandingOS",
  "description": "The operating system behind your brand.",
  "icons": [
    { "src": "/favicon.svg", "sizes": "any", "type": "image/svg+xml" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "theme_color": "#ffffff",
  "background_color": "#ffffff",
  "display": "browser",
  "start_url": "/"
}
JSON

  echo "  ✓ ${dir#"$ROOT/"}"
}

echo "BrandingOS app icons ← ${SRC#"$ROOT/"}"
emit "$ROOT/public"
emit "$ROOT/landingpage/public"
