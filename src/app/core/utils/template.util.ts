import { Competition } from '../models/domain.models';

/**
 * Replaces $path.to.value tokens with the corresponding value from competition.
 * Returns '' for null/undefined or missing paths.
 */
export function resolveTemplate(template: string, competition: Competition): string {
  return template.replace(/\$[\w.]+/g, (match) => {
    const path = match.slice(1).split('.');
    let val: unknown = competition;
    for (const key of path) {
      if (val == null || typeof val !== 'object') return '';
      val = (val as Record<string, unknown>)[key];
    }
    return val != null ? String(val) : '';
  });
}
