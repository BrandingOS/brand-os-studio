/**
 * Where the product lives, as seen from the landing page.
 *
 * Empty by default, which means the SAME origin — the shape this deploy
 * takes on demo.brandingos.ai, where the landing is served at `/` and
 * the app answers every other path out of one Cloudflare Pages project
 * (see scripts/build-landing.mjs and functions/_middleware.ts in the
 * repo root).
 *
 * A deploy that serves the landing on its OWN host — brandingos.ai, or
 * `npm run dev` in this folder — sets VITE_APP_URL to the app's origin
 * (e.g. `https://demo.brandingos.ai`, or `http://localhost:8080`).
 */
export const APP_URL: string = (import.meta.env.VITE_APP_URL as string | undefined) ?? '';

/** A path inside the product, resolved against wherever it lives. */
export const appPath = (path: string): string => `${APP_URL}${path}`;
