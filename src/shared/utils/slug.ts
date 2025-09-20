/**
 * Utility functions for generating and validating slugs
 */

/**
 * Generate a slug from a brand name
 * Converts "The Brand Name" to "the_brand_name"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_'); // Replace spaces with underscores
}

/**
 * Validate if a string is a valid slug format
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_]+$/.test(slug) && slug.length > 0;
}

/**
 * Check if a string looks like a UUID (for backward compatibility)
 */
export function isUuid(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}