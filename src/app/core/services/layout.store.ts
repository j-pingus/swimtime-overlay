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
  private localUpdateListeners: Array<(s: LayoutStoreState) => void> = [];

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

  /** Apply a state patch arriving from another window — never triggers local broadcast. */
  applyRemoteState(state: LayoutStoreState): void {
    this._state.set(state);
  }

  /** Register a callback invoked synchronously on every local state mutation. */
  onLocalUpdate(fn: (s: LayoutStoreState) => void): () => void {
    this.localUpdateListeners.push(fn);
    return () => {
      this.localUpdateListeners = this.localUpdateListeners.filter((l) => l !== fn);
    };
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
      if (raw) return JSON.parse(raw) as LayoutStoreState;
    } catch {}
    return { layouts: [], activeLayoutId: null };
  }

  private persist(state: LayoutStoreState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}
