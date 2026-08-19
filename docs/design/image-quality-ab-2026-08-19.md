# Prompt pipeline A/B — OLD vs NEW

Brand: **Uniex** (seed brand, complete identity + logo system)
Both pipelines called the real `anthropic-proxy`. No images generated — this isolates PROMPT quality.


---

## Social post with exact copy

**User typed:**
```
Instagram post announcing our new same-day delivery service in Riyadh
```
**Copy supplied:**
```json
{
  "headline": "Same day. Every day.",
  "subhead": "Now live in Riyadh",
  "cta": "Book a pickup"
}
```

### OLD — what actually went to the image model
```text
Modern, clean Instagram post announcing same-day delivery service in Riyadh. Bright, optimistic scene with a young person receiving a package at their doorstep, smiling with relief and excitement. Urban Riyadh setting visible in background, warm sunlight, contemporary aesthetic. Include the Uniex brand logo prominently in top corner or bottom right, undistorted and naturally placed. Use deep navy (#001563) and fresh green (#68BE69) as accent colors in design elements, typography, or service-highlight graphics. Professional yet approachable tone, modern typography, 1:1 square composition optimized for Instagram feed.
```
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69"]` · `negativePrompt`: `blurry, cluttered, dated design, generic stock photo, unprofessional, overly salesy, text-heavy, low quality, shadows obscuring logo, distorted branding`

### NEW — what goes to the image model now
```text
FINISHED INSTAGRAM POST — 1:1 Square.
Deliver a complete, publication-ready composition that could be posted as it is:
artwork, typography and layout together in one finished piece.
It must NOT be an empty background, a texture, a plate with space left for text
to be added later, a template with placeholder boxes, or a mockup of a design.

REQUEST (the user's own words, which must be honoured): Instagram post announcing our new same-day delivery service in Riyadh

SUBJECT — A sleek, dynamic scene evoking swift city-wide delivery in Riyadh: a motorcycle courier in motion against a softly blurred Riyadh skyline at golden hour, with warm amber light catching the rider's jacket and a branded parcel box in Uniex deep navy. The city backdrop transitions from dusky sky into deep navy at the base, grounding the composition in the brand world.

TEXT — set ONLY the following words, spelled exactly as written, with correct
letterforms and spacing. Do not add, translate, shorten, rephrase or duplicate them,
and do not add any other word anywhere in the frame:
  • Headline (largest, most prominent): “Same day. Every day.”
  • Supporting line (smaller, secondary): “Now live in Riyadh”
  • Call to action (a button or a clearly separated line): “Book a pickup”

BRAND — Uniex.
  • Dominant colour: #001563
  • Supporting colour: #68BE69
  • Supporting colour: #0A0F2E
  • Typography: set real, legible type with a clear size hierarchy, in the character of IBM Plex Sans Arabic.

LOGO — the supplied reference image is Uniex's real logo.
Reproduce it EXACTLY: same shapes, same proportions, same colours, unrotated,
unstretched, no redraw, no restyle, no added glow, bevel or outline.
Place it top left, at roughly 12–16% of the frame width, with clear
space around it of at least its own cap height. If it cannot be reproduced faithfully,
leave it out rather than approximate it.

COMPOSITION — Square 1:1 format. The courier occupies the left-centre as the kinetic focal point, angled slightly right to suggest forward momentum. The headline 'Same day. Every day.' is set large and bold in the upper-right quadrant in white, stacked across two lines. Directly below it, the subhead 'Now live in Riyadh' sits in secondary green at a smaller scale. The CTA 'Book a pickup' anchors the lower-right corner as a pill-shaped button in #68BE69 with dark text. The Uniex logo sits top-left. The deep navy-to-black gradient base unifies all elements without any empty placeholder zones. Keep a 7% safe margin on every edge; nothing important may touch or cross it. One clear focal point and one obvious reading order.

STYLE — Cinematic digital illustration with a semi-realistic render style; motion blur on the wheels and background to convey speed; rim lighting from a warm golden-hour source on the left, cool deep-navy fill light on the right; clean vector-sharp typography against the soft illustrative background; overall finish is polished and contemporary.

DO NOT INCLUDE — invented slogans, marketing copy, captions or any words not listed above; discount badges, sale stickers, percentage offers, price tags or "limited time" devices; lorem ipsum, placeholder text or greeked type; misspelled, garbled, doubled or nonsensical lettering; any logo, wordmark, watermark or signature other than the one supplied; QR codes, barcodes, app-store badges or social-media icon rows; device bezels, browser chrome, phone mockups or screen frames; collage, contact-sheet or grid-of-thumbnails layouts; text cropped by the edge of the frame.
```
`kind`: **design** (instagram post) — _You supplied copy, so this is a composed design._
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69","#0A0F2E"]` · `source`: `claude`

**negativePrompt:** `Arabic stereotypes, cluttered background, static or parked vehicle, muddy colours, lens flare overload, extra couriers, placeholder boxes, invented slogans, marketing copy, captions or any words not listed above, discount badges, sale stickers, percentage offers, price tags or "limited time" devices, lorem ipsum, placeholder text or greeked type, misspelled, garbled, doubled or nonsensical lettering, any logo, wordmark, watermark or signature other than the one supplied, QR codes, barcodes, app-store badges or social-media icon rows, device bezels, browser chrome, phone mockups or screen frames, collage, contact-sheet or grid-of-thumbnails layouts, text cropped by the edge of the frame`

### Signals

| signal | OLD | NEW |
|---|---|---|
| wordCount | 85 | 562 |
| saysFinished | false | true |
| asksForEmptySpace | false | false |
| quotesExactCopy | false | true |
| bansInventedCopy | false | true |
| bansDiscounts | false | true |
| namesTypography | true | true |
| hasSafeMargin | false | true |
| hasLogoRule | true | true |

---

## Ad with NO copy (the invented-discount trap)

**User typed:**
```
An ad creative for our fleet tracking product
```
**Copy supplied:** _none_

### OLD — what actually went to the image model
```text
Professional fleet tracking dashboard on a modern truck driver's tablet screen, showing real-time GPS routes, vehicle locations, and analytics in deep navy (#001563) and fresh green (#68BE69) interface elements. Bright, confident lighting through a truck cabin window. Driver wearing headset, focused and empowered. Clean, accessible UI with global map overlay. Modern, tech-forward, trustworthy atmosphere. High-definition, professional photography style.
```
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69"]` · `negativePrompt`: `cluttered, outdated, dark, unsafe, unprofessional, blurry UI, cartoon, low-quality, text-heavy, confusing`

### NEW — what goes to the image model now
```text
FINISHED ADVERT — 1:1 Square.
Deliver a complete, publication-ready composition that could be posted as it is:
artwork, typography and layout together in one finished piece.
It must NOT be an empty background, a texture, a plate with space left for text
to be added later, a template with placeholder boxes, or a mockup of a design.

REQUEST (the user's own words, which must be honoured): An ad creative for our fleet tracking product

SUBJECT — A sleek, modern fleet of vehicles — a mix of delivery vans and long-haul trucks — seen from a slightly elevated birds-eye perspective on an open highway network at dusk, with glowing GPS pin markers and subtle route-line overlays connecting each vehicle, suggesting real-time tracking. The surfaces are crisp white and navy-dark metal, lit by warm amber ambient dusk light with cool blue digital interface glows emanating from dashboard screens visible through windshields.

TEXT — no copy was supplied. The ONLY words permitted are the brand name “Uniex”.
Do not invent a headline, slogan, caption, price, percentage or label of any kind.

BRAND — Uniex.
  • Dominant colour: #001563
  • Supporting colour: #68BE69
  • Supporting colour: #0A0F2E
  • Typography: set real, legible type with a clear size hierarchy, in the character of IBM Plex Sans Arabic.

LOGO — the supplied reference image is Uniex's real logo.
Reproduce it EXACTLY: same shapes, same proportions, same colours, unrotated,
unstretched, no redraw, no restyle, no added glow, bevel or outline.
Place it bottom centre, at roughly 12–16% of the frame width, with clear
space around it of at least its own cap height. If it cannot be reproduced faithfully,
leave it out rather than approximate it.

COMPOSITION — Focal point is the lead vehicle, centred and large, with the fleet fanning outward behind it in a dynamic receding diagonal toward the upper-right. Digital tracking lines and pin-drop markers arc across the scene, tying the vehicles together visually. The Uniex wordmark sits bottom-centre in mono.white, grounded on a deep navy band that spans the full width — acting as a finished base bar rather than placeholder space. The overall frame feels balanced and complete, with the sky-to-road gradient occupying the upper half and the vehicle cluster dominating the lower-centre two-thirds. Keep a 7% safe margin on every edge; nothing important may touch or cross it. One clear focal point and one obvious reading order. No further copy is being set, so do NOT reserve, mask or flatten any area as a placeholder for text. Every part of the frame must be resolved and finished; any negative space must read as a deliberate compositional choice, not an empty slot.

STYLE — High-end CGI / 3D render with photorealistic materials, soft cinematic depth-of-field on background trucks, subtle lens flare on dusk horizon, cool-to-warm colour grading, and semi-transparent HUD overlay lines rendered in glowing #68BE69 green on the navy atmosphere.

DO NOT INCLUDE — invented slogans, marketing copy, captions or any words not listed above; discount badges, sale stickers, percentage offers, price tags or "limited time" devices; lorem ipsum, placeholder text or greeked type; misspelled, garbled, doubled or nonsensical lettering; any logo, wordmark, watermark or signature other than the one supplied; QR codes, barcodes, app-store badges or social-media icon rows; device bezels, browser chrome, phone mockups or screen frames; collage, contact-sheet or grid-of-thumbnails layouts; text cropped by the edge of the frame.
```
`kind`: **design** (advert) — _You asked for a advert._
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69","#0A0F2E"]` · `source`: `claude`

**negativePrompt:** `cartoon vehicles, flat illustration, blurry GPS markers, cluttered UI elements obscuring vehicles, washed-out colours, empty white space panels, invented slogans, marketing copy, captions or any words not listed above, discount badges, sale stickers, percentage offers, price tags or "limited time" devices, lorem ipsum, placeholder text or greeked type, misspelled, garbled, doubled or nonsensical lettering, any logo, wordmark, watermark or signature other than the one supplied, QR codes, barcodes, app-store badges or social-media icon rows, device bezels, browser chrome, phone mockups or screen frames, collage, contact-sheet or grid-of-thumbnails layouts, text cropped by the edge of the frame`

### Signals

| signal | OLD | NEW |
|---|---|---|
| wordCount | 58 | 561 |
| saysFinished | false | true |
| asksForEmptySpace | false | false |
| quotesExactCopy | null | null |
| bansInventedCopy | false | true |
| bansDiscounts | false | true |
| namesTypography | false | true |
| hasSafeMargin | false | true |
| hasLogoRule | false | true |

---

## A plain photograph (must NOT become a design)

**User typed:**
```
a photo of a delivery van on a coastal road at sunrise
```
**Copy supplied:** _none_

### OLD — what actually went to the image model
```text
A delivery van on a winding coastal road at golden-hour sunrise, warm light illuminating the vehicle and surrounding landscape. The van is modern, professional, and clearly branded with deep navy (#001563) and bright green (#68BE69) livery. Rocky cliffs and calm ocean in soft focus background. Cinematic photography, sharp focus on van, golden and amber light filtering through morning mist, 3:2 landscape, professional automotive photography style.
```
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69"]` · `negativePrompt`: `blurry, text overlay, distorted branding, cartoon, illustration, dark or overcast, parked van only`

### NEW — what goes to the image model now
```text
IMAGE — 3:2 Landscape.
A single finished photograph or illustration. No text, no logo, no layout.

REQUEST (the user's own words, which must be honoured): a photo of a delivery van on a coastal road at sunrise

SUBJECT — A clean white delivery van with subtle navy-blue accent detailing drives along a winding coastal road at sunrise, the vehicle's bodywork catching warm amber and rose-gold light reflected off the calm sea below. The road hugs a dramatic clifftop, sea mist still clinging to the water's surface, telegraph poles receding into the distance.

TEXT — none. This is a wordless image: no lettering, no numerals, no signage, no captions.

BRAND — Uniex.
  • Dominant colour: #001563
  • Supporting colour: #68BE69
  • Typography: set real, legible type with a clear size hierarchy, in the character of IBM Plex Sans Arabic.

LOGO — none. Do not draw, invent or imply a logo, wordmark or watermark.

COMPOSITION — The van occupies the left-centre third of the frame, travelling from left to right, with the road curving away behind it into a softly blurred coastal horizon. The clifftop drop and ocean fill the lower-right quadrant, while the luminous sunrise gradient anchors the upper sky. The Uniex logo sits bottom-right, clear of the sea, at roughly 10% of frame width. No blank space is reserved — the sky, sea and road balance the frame completely. Keep a 7% safe margin on every edge; nothing important may touch or cross it. One clear focal point and one obvious reading order.

STYLE — Cinematic location photography with a wide-angle crop (equivalent ~24 mm), warm golden-hour grading that deepens the navy shadows in the road's foreground and saturates the teal-green coastal vegetation; slight lens flare from the low sun, natural depth-of-field keeping the van sharp and the far horizon softly diffused.

DO NOT INCLUDE — any text, lettering, numerals or signage; logos, watermarks or brand marks; discount badges, sale stickers, percentage offers, price tags or "limited time" devices; misspelled, garbled, doubled or nonsensical lettering; any logo, wordmark, watermark or signature other than the one supplied; QR codes, barcodes, app-store badges or social-media icon rows; device bezels, browser chrome, phone mockups or screen frames; collage, contact-sheet or grid-of-thumbnails layouts; text cropped by the edge of the frame.
```
`kind`: **image** (image) — _You asked for a picture, not a layout._
`useLogo`: **true** · `paletteHexes`: `["#001563","#68BE69"]` · `source`: `claude`

**negativePrompt:** `text on van sides, advertising wraps, blurred van, flooded road, overcast flat light, cartoon style, fisheye distortion, any text, lettering, numerals or signage, logos, watermarks or brand marks, discount badges, sale stickers, percentage offers, price tags or "limited time" devices, misspelled, garbled, doubled or nonsensical lettering, any logo, wordmark, watermark or signature other than the one supplied, QR codes, barcodes, app-store badges or social-media icon rows, device bezels, browser chrome, phone mockups or screen frames, collage, contact-sheet or grid-of-thumbnails layouts, text cropped by the edge of the frame`

### Signals

| signal | OLD | NEW |
|---|---|---|
| wordCount | 65 | 377 |
| saysFinished | false | true |
| asksForEmptySpace | false | false |
| quotesExactCopy | null | null |
| bansInventedCopy | false | false |
| bansDiscounts | false | true |
| namesTypography | false | true |
| hasSafeMargin | false | true |
| hasLogoRule | false | true |