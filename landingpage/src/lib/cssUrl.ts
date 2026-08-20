/**
 * A CSS `url()` token that survives a data URI.
 *
 * Vite inlines any asset under `build.assetsInlineLimit` (4 KB by
 * default) as a data URI instead of emitting a file, and its SVG
 * encoding keeps the file's own quote characters:
 *
 *     url(data:image/svg+xml,%3csvg viewBox="0 0 1180 320" …)
 *
 * An UNQUOTED CSS url() token may not contain quotes, parentheses or
 * whitespace, so the browser rejects the declaration outright. For a
 * mask that means `mask-image: none` — and an element painted with
 * `background: currentColor` through that mask stops being a logo and
 * becomes a solid rectangle. It fails silently: no console error, no
 * network 404, and it only shows up in a BUILD, because the dev server
 * hands back a plain path.
 *
 * Quoting the value fixes it; percent-encoding any `"` inside keeps the
 * quoting unambiguous. A data URI decodes %22 back to `"`, so the image
 * itself is untouched — and which side of the 4 KB limit an asset falls
 * on stops mattering.
 */
export const cssUrl = (url: string): string => `url("${url.replace(/"/g, '%22')}")`;
