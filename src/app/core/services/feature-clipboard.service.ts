import { Injectable, signal, computed } from '@angular/core';
import { AnyFeature } from '../models/layout.model';

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
  private readonly _clipboard = signal<AnyFeature[] | null>(null);

  readonly hasContent = computed(() => this._clipboard() !== null);

  copy(features: AnyFeature[]): void {
    this._clipboard.set(features);
  }

  paste(): AnyFeature[] | null {
    const content = this._clipboard();
    return content ? remapIds(content) : null;
  }
}
