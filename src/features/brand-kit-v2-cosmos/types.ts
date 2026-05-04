/**
 * Shared types for the cosmos Brand Kit. Lifted out of
 * `BrandKitCardEditor.tsx` so the cosmos renderer dispatcher can
 * import the same shape and apply user content edits to the live
 * preview.
 */
export type TemplateOverrides = {
  name?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showLogo?: boolean;
  headline?: string;
  body?: string;
  cta?: string;
  email?: string;
  phone?: string;
  website?: string;
  slideTitle?: string;
  slideSubtitle?: string;
};

/**
 * Prop-driven content for business-card renderers. Replaces the
 * old DOM-walker substitution path: instead of finding "Jane Smith"
 * literals in the rendered output and mutating them, the editor
 * passes a `BusinessCardContent` directly to the renderer, which
 * paints from props.
 *
 * See `defaultBusinessCardContent(brand)` for the brand-derived
 * defaults. Each renderer also derives `firstName`, `lastName`,
 * and `initials` internally for designs that split the name.
 */
export type BusinessCardContent = {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
};

/**
 * Build the default content for a brand — used when the renderer
 * is mounted standalone (drilldown grid) or when an editor field
 * is empty. The slug-based email/website mirror the literals the
 * old hardcoded designs used, so the visual baseline is unchanged.
 */
export function defaultBusinessCardContent(brand: { name: string }): BusinessCardContent {
  const slug = brand.name.toLowerCase().replace(/\s+/g, '-');
  return {
    fullName: 'Jane Smith',
    jobTitle: 'Vice President',
    email: `jane@${slug}.com`,
    phone: '+1 234 56789',
    website: `${slug}.com`,
  };
}

/**
 * Merge optional content with the brand defaults, then derive
 * convenience fields renderers can use without re-splitting.
 *  - `firstName` / `lastName` for split-name designs
 *  - `initials`  for monogram tiles
 */
export function deriveBusinessCardContent(
  brand: { name: string },
  content?: Partial<BusinessCardContent>,
): BusinessCardContent & { firstName: string; lastName: string; initials: string } {
  const defaults = defaultBusinessCardContent(brand);
  const merged: BusinessCardContent = {
    fullName: content?.fullName?.length ? content.fullName : defaults.fullName,
    jobTitle: content?.jobTitle?.length ? content.jobTitle : defaults.jobTitle,
    email: content?.email?.length ? content.email : defaults.email,
    phone: content?.phone?.length ? content.phone : defaults.phone,
    website: content?.website?.length ? content.website : defaults.website,
  };
  const parts = merged.fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? merged.fullName;
  const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';
  const initials = parts
    .slice(0, 3)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');
  return { ...merged, firstName, lastName, initials };
}
