import { Injectable, signal, computed } from '@angular/core';
import { AnyFeature } from '../models/layout.model';

const SS_KEY = 'swimtime_clipboard';

function remapIds(features: AnyFeature[]): AnyFeature[] {
  const idMap = new Map(features.map((f) => [f.id, crypto.randomUUID()]));
  return features.map((f) => ({
    ...f,
    id: idMap.get(f.id)!,
    groupId: f.groupId ? (idMap.get(f.groupId) ?? f.groupId) : undefined,
  }));
}

@Injectable({ providedIn: 'root' })
export class FeatureClipboardService {
  private readonly _clipboard = signal<AnyFeature[] | null>(loadFromSession());

  readonly hasContent = computed(() => this._clipboard() !== null);

  copy(features: AnyFeature[]): void {
    this._clipboard.set(features);
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(features));
    } catch {
      // Ignore write failures (e.g. private browsing storage quota).
    }
  }

  paste(): AnyFeature[] | null {
    const content = this._clipboard();
    return content ? remapIds(content) : null;
  }
}

function loadFromSession(): AnyFeature[] | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    return raw ? (JSON.parse(raw) as AnyFeature[]) : null;
  } catch {
    return null;
  }
}
