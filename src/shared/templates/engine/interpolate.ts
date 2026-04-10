/**
 * Interpolation Engine — replaces {{variable}} references with resolved values.
 */

const VAR_REGEX = /\{\{([^}]+)\}\}/g;

/** Check if a string contains any {{variable}} references */
export function hasVariables(value: string): boolean {
  return VAR_REGEX.test(value);
}

/** Replace all {{variable}} references in a string with resolved values */
export function interpolateString(template: string, vars: Record<string, string>): string {
  if (!template || !template.includes('{{')) return template;
  return template.replace(VAR_REGEX, (match, path: string) => {
    const trimmed = path.trim();
    return vars[trimmed] ?? match; // Keep original if not found
  });
}

/**
 * Deep-interpolate all string values in an object tree.
 * Returns a new object (does not mutate input).
 */
export function interpolateDeep<T>(obj: T, vars: Record<string, string>): T {
  if (typeof obj === 'string') {
    return interpolateString(obj, vars) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateDeep(item, vars)) as unknown as T;
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateDeep(value, vars);
    }
    return result as T;
  }
  return obj;
}
