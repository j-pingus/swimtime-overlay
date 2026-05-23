import { Injectable, signal, computed } from '@angular/core';
import { Layout } from '../models/layout.model';

export type LayoutStoreState = {
  layouts: Layout[];
  activeLayoutId: string | null;
};

const STORAGE_KEY = 'swimtime_layouts';

@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly _state = signal<LayoutStoreState>(this.load());

  readonly layouts = computed(() => this._state().layouts);
  readonly activeLayoutId = computed(() => this._state().activeLayoutId);
  readonly activeLayout = computed(() => {
    const id = this._state().activeLayoutId;
    return this._state().layouts.find((l) => l.id === id) ?? null;
  });

  createLayout(name: string): Layout {
    const layout: Layout = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: Date.now(),
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

  /** Apply a state patch arriving from another window via BroadcastChannel. */
  applyRemoteState(state: LayoutStoreState): void {
    this._state.set(state);
  }

  getState(): LayoutStoreState {
    return this._state();
  }

  private update(fn: (s: LayoutStoreState) => LayoutStoreState): void {
    const next = fn(this._state());
    this._state.set(next);
    this.persist(next);
  }

  private load(): LayoutStoreState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as LayoutStoreState;
    } catch {}
    return { layouts: [], activeLayoutId: null };
  }

  private persist(state: LayoutStoreState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
