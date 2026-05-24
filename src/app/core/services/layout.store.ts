import { Injectable, signal, computed } from '@angular/core';
import { Layout, AnyFeature, BaseFeature } from '../models/layout.model';

export type LayoutStoreState = {
  layouts: Layout[];
  activeLayoutId: string | null;
};

const STORAGE_KEY = 'swimtime_layouts';

@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly _state = signal<LayoutStoreState>(this.load());
  private localUpdateListeners: Array<(s: LayoutStoreState) => void> = [];

  readonly layouts = computed(() => this._state().layouts);
  readonly activeLayoutId = computed(() => this._state().activeLayoutId);
  readonly activeLayout = computed(() => {
    const id = this._state().activeLayoutId;
    return this._state().layouts.find((l) => l.id === id) ?? null;
  });

  // --- Layout CRUD ---

  createLayout(name: string): Layout {
    const layout: Layout = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: Date.now(),
      features: [],
    };
    this.update((s) => ({
      layouts: [...s.layouts, layout],
      activeLayoutId: layout.id,
    }));
    return layout;
  }

  setActiveLayout(id: string): void {
    this.update((s) => ({ ...s, activeLayoutId: id }));
  }

  renameLayout(id: string, name: string): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) => l.id === id ? { ...l, name } : l),
    }));
  }

  deleteLayout(id: string): void {
    this.update((s) => ({
      layouts: s.layouts.filter((l) => l.id !== id),
      activeLayoutId: s.activeLayoutId === id ? null : s.activeLayoutId,
    }));
  }

  // --- Feature CRUD ---

  addFeature(layoutId: string, feature: BaseFeature): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) =>
        l.id === layoutId ? { ...l, features: [...l.features, feature] } : l,
      ),
    }));
  }

  updateFeature(layoutId: string, feature: BaseFeature): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) =>
        l.id === layoutId
          ? { ...l, features: l.features.map((f) => (f.id === feature.id ? feature : f)) }
          : l,
      ),
    }));
  }

  reorderFeatures(layoutId: string, features: AnyFeature[]): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) =>
        l.id === layoutId ? { ...l, features } : l,
      ),
    }));
  }

  removeFeature(layoutId: string, featureId: string): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) =>
        l.id === layoutId
          ? { ...l, features: l.features.filter((f) => f.id !== featureId) }
          : l,
      ),
    }));
  }

  // --- Sync ---

  applyRemoteState(state: LayoutStoreState): void {
    this._state.set(state);
  }

  onLocalUpdate(fn: (s: LayoutStoreState) => void): () => void {
    this.localUpdateListeners.push(fn);
    return () => {
      this.localUpdateListeners = this.localUpdateListeners.filter((l) => l !== fn);
    };
  }

  getState(): LayoutStoreState {
    return this._state();
  }

  private update(fn: (s: LayoutStoreState) => LayoutStoreState): void {
    const next = fn(this._state());
    this._state.set(next);
    this.persist(next);
    this.localUpdateListeners.forEach((l) => l(next));
  }

  private load(): LayoutStoreState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw) as LayoutStoreState;
        // Migrate layouts that predate the features field
        state.layouts = state.layouts.map((l) => ({ ...l, features: l.features ?? [] }));
        return state;
      }
    } catch {}
    return { layouts: [], activeLayoutId: null };
  }

  private persist(state: LayoutStoreState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
