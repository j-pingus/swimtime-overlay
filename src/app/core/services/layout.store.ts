import { Injectable, signal, computed } from '@angular/core';
import { Layout, AnyFeature, BaseFeature } from '../models/layout.model';

export type LayoutStoreState = {
  layouts: Layout[];
  activeLayoutId: string | null;
};

// ── IndexedDB helpers ──────────────────────────────────────────────────────

const IDB_NAME    = 'swimtime';
const IDB_VERSION = 1;
const IDB_STORE   = 'layouts';
const IDB_KEY     = 'state';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

function idbGet(db: IDBDatabase): Promise<LayoutStoreState | null> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE).objectStore(IDB_STORE).get(IDB_KEY);
    req.onsuccess = () => resolve((req.result as LayoutStoreState) ?? null);
    req.onerror   = () => reject(req.error);
  });
}

function idbSet(db: IDBDatabase, state: LayoutStoreState): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(state, IDB_KEY);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// Legacy localStorage key — read once for migration, then cleared.
const LS_KEY = 'swimtime_layouts';

// ── Store ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LayoutStore {
  private readonly _state = signal<LayoutStoreState>({ layouts: [], activeLayoutId: null });
  private readonly db = openIDB();
  private localUpdateListeners: Array<(s: LayoutStoreState) => void> = [];

  readonly layouts = computed(() => this._state().layouts);
  readonly activeLayoutId = computed(() => this._state().activeLayoutId);
  readonly activeLayout = computed(() => {
    const id = this._state().activeLayoutId;
    return this._state().layouts.find((l) => l.id === id) ?? null;
  });

  /** Called by APP_INITIALIZER — loads persisted state before the app renders. */
  async init(): Promise<void> {
    try {
      const db = await this.db;
      let state = await idbGet(db);

      if (!state) {
        // One-time migration from localStorage
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          state = JSON.parse(raw) as LayoutStoreState;
          await idbSet(db, state);
          localStorage.removeItem(LS_KEY);
        }
      }

      if (state) {
        this._state.set(this.migrate(state));
      }
    } catch (e) {
      console.warn('[LayoutStore] init failed, starting empty', e);
    }
  }

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

  // --- Internal ---

  private update(fn: (s: LayoutStoreState) => LayoutStoreState): void {
    const next = fn(this._state());
    this._state.set(next);
    void this.persist(next);
    this.localUpdateListeners.forEach((l) => l(next));
  }

  private async persist(state: LayoutStoreState): Promise<void> {
    try {
      const db = await this.db;
      await idbSet(db, state);
    } catch (e) {
      console.warn('[LayoutStore] persist failed', e);
    }
  }

  private migrate(state: LayoutStoreState): LayoutStoreState {
    return {
      ...state,
      layouts: state.layouts.map((l) => ({
        ...l,
        features: (l.features ?? []).map((f) => {
          if (f.type !== 'lane' || 'displayDuration' in f) return f;
          return Object.assign({}, f, { displayDuration: null }) as AnyFeature;
        }),
      })),
    };
  }
}
