import { Injectable, signal, computed } from '@angular/core';
import { Layout, AnyFeature, BaseFeature, GroupFeature, MessageTypeRule, MessageTypeRules } from '../models/layout.model';

export type LayoutStoreState = {
  layouts: Layout[];
  activeLayoutId: string | null;
  messageTypeRules: MessageTypeRules;
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
  private readonly _state = signal<LayoutStoreState>({ layouts: [], activeLayoutId: null, messageTypeRules: {} });
  private readonly db = openIDB();
  private localUpdateListeners: Array<(s: LayoutStoreState) => void> = [];

  readonly layouts = computed(() => this._state().layouts);
  readonly activeLayoutId = computed(() => this._state().activeLayoutId);
  readonly activeLayout = computed(() => {
    const id = this._state().activeLayoutId;
    return this._state().layouts.find((l) => l.id === id) ?? null;
  });
  readonly messageTypeRules = computed(() => this._state().messageTypeRules);

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
      ...s,
      layouts: [...s.layouts, layout],
      activeLayoutId: layout.id,
    }));
    return layout;
  }

  setActiveLayout(id: string | null): void {
    this.update((s) => ({ ...s, activeLayoutId: id }));
  }

  // --- Message type rules ---

  setMessageTypeRule(messageType: string, rule: MessageTypeRule): void {
    this.update((s) => ({
      ...s,
      messageTypeRules: { ...s.messageTypeRules, [messageType]: rule },
    }));
  }

  clearMessageTypeRule(messageType: string): void {
    this.update((s) => {
      const { [messageType]: _, ...rest } = s.messageTypeRules;
      return { ...s, messageTypeRules: rest };
    });
  }

  importLayout(layout: Layout): void {
    const imported: Layout = {
      ...layout,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      features: remapFeatureIds(layout.features),
    };
    this.update((s) => ({ ...s, layouts: [...s.layouts, imported] }));
  }

  cloneLayout(id: string): void {
    this.update((s) => {
      const source = s.layouts.find((l) => l.id === id);
      if (!source) return s;
      const clone: Layout = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copy)`,
        createdAt: Date.now(),
        features: remapFeatureIds(source.features),
      };
      return { ...s, layouts: [...s.layouts, clone] };
    });
  }

  renameLayout(id: string, name: string): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) => l.id === id ? { ...l, name } : l),
    }));
  }

  deleteLayout(id: string): void {
    this.update((s) => ({
      ...s,
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
      layouts: s.layouts.map((l) => {
        if (l.id !== layoutId) return l;
        const removed = l.features.find((f) => f.id === featureId);
        let features = l.features.filter((f) => f.id !== featureId);
        // If we're removing a group, also clear groupId from its children
        if (removed?.type === 'group') {
          features = features.map((f) => f.groupId === featureId ? { ...f, groupId: undefined } : f);
        }
        return { ...l, features };
      }),
    }));
  }

  /** Groups featureIds under a new GroupFeature.
   *  The group header + children are consolidated adjacent in the array so that
   *  CDK drag-drop indices stay coherent with the visual list order.
   *  Returns the new group's id. */
  groupFeatures(layoutId: string, featureIds: string[], label: string): string {
    const groupId = crypto.randomUUID();
    const group: GroupFeature = { type: 'group', id: groupId, label, x: 0, y: 0, width: 0, height: 0 };
    const idSet = new Set(featureIds);
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) => {
        if (l.id !== layoutId) return l;
        // Insertion point: position of the first member in the original array.
        const firstMemberIdx = l.features.findIndex((f) => idSet.has(f.id));
        // Collect children (in original order) and assign groupId.
        const children = l.features.filter((f) => idSet.has(f.id)).map((f) => ({ ...f, groupId }));
        // Remove children, then insert [group, ...children] at the first-member slot.
        const rest = l.features.filter((f) => !idSet.has(f.id));
        let insertAt = 0;
        for (let i = 0; i < firstMemberIdx; i++) {
          if (!idSet.has(l.features[i].id)) insertAt++;
        }
        rest.splice(insertAt, 0, group, ...children);
        return { ...l, features: rest };
      }),
    }));
    return groupId;
  }

  /** Removes a group — clears groupId from children and removes the GroupFeature. */
  ungroupFeatures(layoutId: string, groupId: string): void {
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) => {
        if (l.id !== layoutId) return l;
        const features = l.features
          .filter((f) => f.id !== groupId)
          .map((f) => f.groupId === groupId ? { ...f, groupId: undefined } : f);
        return { ...l, features };
      }),
    }));
  }

  /** Updates multiple features in one pass — used for group moves. */
  batchUpdateFeatures(layoutId: string, features: AnyFeature[]): void {
    const map = new Map(features.map((f) => [f.id, f]));
    this.update((s) => ({
      ...s,
      layouts: s.layouts.map((l) =>
        l.id === layoutId
          ? { ...l, features: l.features.map((f) => map.get(f.id) ?? f) }
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
      messageTypeRules: state.messageTypeRules ?? {},
      layouts: state.layouts.map((l) => ({
        ...l,
        features: (l.features ?? []).map((f) => {
          let patched = f;
          if (f.type === 'lane' && !('displayDuration' in f)) {
            patched = Object.assign({}, patched, { displayDuration: null }) as AnyFeature;
          }
          if ((f.type === 'text' || f.type === 'lane') && !('outlineColor' in f)) {
            patched = Object.assign({}, patched, { outlineColor: null }) as AnyFeature;
          }
          if (f.type === 'lane' && !('heatSource' in f)) {
            patched = Object.assign({}, patched, { heatSource: 'current' }) as AnyFeature;
          }
          return patched;
        }),
      })),
    };
  }
}

/** Reassigns all feature IDs (and remaps groupId references) for clone/import. */
function remapFeatureIds(features: AnyFeature[]): AnyFeature[] {
  const idMap = new Map(features.map((f) => [f.id, crypto.randomUUID()]));
  return features.map((f) => ({
    ...f,
    id: idMap.get(f.id)!,
    groupId: f.groupId ? idMap.get(f.groupId) : undefined,
  }));
}
