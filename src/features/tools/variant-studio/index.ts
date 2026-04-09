/**
 * Variant Studio — public API for the rest of the app.
 *
 * The route entries import directly from this file so the rest of the
 * codebase never reaches into the engine, render, or component
 * folders. Tools are encapsulated by their `index.ts`.
 */
export { VariantStudio } from './components/VariantStudio';
export { variantStudioMaterializer } from './materializer';
