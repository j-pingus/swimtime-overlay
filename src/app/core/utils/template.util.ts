/** Built-in clock tokens resolved from the wall clock, not the competition object. */
const CLOCK_TOKENS = new Set(['HH', 'MM', 'SS']);

function resolveClockToken(token: string, now: Date): string {
  if (token === 'HH') return String(now.getHours()).padStart(2, '0');
  if (token === 'MM') return String(now.getMinutes()).padStart(2, '0');
  if (token === 'SS') return String(now.getSeconds()).padStart(2, '0');
  return '';
}

/**
 * Replaces $path.to.value tokens with the corresponding value from root.
 * Built-in tokens ${HH}, ${MM}, ${SS} resolve to the current hour/minute/second
 * from `now` (when provided).
 * Returns '' for null/undefined or missing paths.
 */
export function resolveTemplate(template: string, root: object, now?: Date): string {
  return template.replace(/\$\{[\w.]+\}/g, (match) => {
    const path = match.slice(2, -1);
    if (now && CLOCK_TOKENS.has(path)) return resolveClockToken(path, now);
    const keys = path.split('.');
    let val: unknown = root;
    for (const key of keys) {
      if (val == null || typeof val !== 'object') return '';
      val = (val as Record<string, unknown>)[key];
    }
    return val != null ? String(val) : '';
  });
}

/**
 * Returns the list of ${...} tokens in template whose path does not exist in root.
 * A path is considered missing if any segment is absent from its parent object/array.
 * Null/undefined values at a valid path are not reported as errors.
 * Built-in clock tokens (${HH}, ${MM}, ${SS}) are always considered resolved.
 */
export function findUnresolvedTokens(template: string, root: object): string[] {
  const unresolved: string[] = [];
  template.replace(/\$\{([\w.]+)\}/g, (match, rawPath: string) => {
    if (CLOCK_TOKENS.has(rawPath)) return '';
    const keys = rawPath.split('.');
    let val: unknown = root;
    for (const key of keys) {
      if (val == null || typeof val !== 'object') { unresolved.push(match); return ''; }
      if (!Object.prototype.hasOwnProperty.call(val, key)) { unresolved.push(match); return ''; }
      val = (val as Record<string, unknown>)[key];
    }
    return '';
  });
  return unresolved;
}
