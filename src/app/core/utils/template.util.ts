/**
 * Replaces $path.to.value tokens with the corresponding value from root.
 * Returns '' for null/undefined or missing paths.
 */
export function resolveTemplate(template: string, root: object): string {
  return template.replace(/\$\{[\w.]+\}/g, (match) => {
    const path = match.slice(2, -1).split('.');
    let val: unknown = root;
    for (const key of path) {
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
 */
export function findUnresolvedTokens(template: string, root: object): string[] {
  const unresolved: string[] = [];
  template.replace(/\$\{([\w.]+)\}/g, (match, rawPath: string) => {
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
