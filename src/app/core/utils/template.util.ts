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
