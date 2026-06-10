# Technical Code Review

✅ = fixed

## Bugs / Behavioral Issues

### Chrono not reset between heats
When a new `START_LIST` event fires, `setCompetition` is called and correctly preserves `chronoStartTime`/`chronoStopTime` (so the previous heat's chrono stays frozen on screen). There is no explicit reset of the chrono when a new heat begins. This means if `CHRONO_START` is late or never fires for the new heat, the overlay keeps showing a frozen time from the previous heat. A `HEAT_LOADED` or `START_LIST` handler should clear both chrono fields.

### ✅ Missing badge colors for `polygon` and `chrono` types
`feature-panel.component.scss` defines `.type-badge--generic/image/text/rect/lane/group` but not `--polygon` or `--chrono`. Both feature types fall back to unstyled (no background/color). Polygon has been in the app for a while so this was likely always missing.

### ✅ `FeatureClipboardService.hasContent` is a plain function, not a signal
```ts
readonly hasContent = () => this._clipboard() !== null;
```
This is called from a template expression (`@if (hasClipboard())`), but because it is not a `computed()` signal, Angular cannot track it as a reactive dependency. The Paste button may not appear/disappear reactively when the clipboard changes. Should be `readonly hasContent = computed(() => this._clipboard() !== null)`.

### `<defs>` elements inside a repeated `@for` block (chrono)
The chrono branch emits a `<defs>/<clipPath>` node directly inside the `@for` feature loop without a `<g>` wrapper. SVG `<defs>` should live at the document level or at minimum in a top-level group. Some renderers may handle this fine, but it is non-standard and fragile; OBS's browser-source renderer may behave differently. The clip-path `<defs>` for text features have the same pattern — they are inside the outer `<g>` but outside a wrapping element. Consider hoisting all `<defs>` to the top of the SVG.

---

## Technical Debt

### `ZoneComponent` mixes display and interaction in one ~400-line component
`ZoneComponent` handles SVG rendering (both config and render modes), drag-move, drag-resize, point dragging for polygons, group bounds computation, and template resolution. It is gated by the `interactive` input but the logic is all in one class. Splitting into a pure `ZoneSurfaceComponent` (display only, used by render) and an `InteractiveZoneComponent` (adds drag overlay) would make both easier to test and extend.

### `LayoutStore.migrate()` has no version guard
Migrations run unconditionally on every load. As fields accumulate, all patches apply to every layout on every startup. When a field is added to an existing type, a patch must be manually added here; there is no mechanism that enforces or checks this. Consider stamping a `schemaVersion` on the persisted state and gate each migration block behind a version comparison.

`migrate()` also uses `Object.assign({}, patched, { field }) as AnyFeature`, which casts away type safety. If a required field is missed, TypeScript will not catch it at compile time.

### Large `ApiService` with ~25 unused methods
`ApiService` exposes methods for swimmers, officials, SITB control, Stream Deck, dummy-officials reset, vj-command, medal ceremony, etc. Only `getCurrentEventAndHeat()` and `getNextHeats()` are called anywhere in the app. The unused methods — and their corresponding DTOs (`SwimmersDto`, `OfficialsDto`, `DummyOfficialsDto`, `CurrentHeatDto`, `CurrentEventDto`, `StatusDto`, `StreamDeckInfoDto`, `CompetitionInfoDto`, `PoolSizeDto`, `EventDto`, `EventResponseDto`) — suggest this service was copied from another project or is a shared API client. Dead code should either be removed or moved to a separate `swimtime-api-client` package to keep the overlay's API surface clear.

### `LayoutListComponent.store` is `protected` instead of `private`
```ts
protected readonly store = inject(LayoutStore);
```
`store` is accessed from the template (`store.layouts()`, `store.activeLayoutId()`, `store.messageTypeRules()`), but Angular templates can access `private` members just fine. Marking it `protected` exposes it unnecessarily to subclasses. Same for `competition`.

### Import validation trusts the JSON structure
`onImportFile` only checks `layout.name && Array.isArray(layout.features)`. A JSON file with an empty features array and any name string passes. There is no check on feature types, required fields, or ID format. Importing a malformed feature (e.g. a `text` feature missing `fontSize`) will produce a runtime error or silent mis-render. A minimal schema check (`typeof f.type === 'string'`, required fields per type) would prevent silent corruption of persisted state.

### No deletion confirmation for layouts
`deleteLayout()` is called directly from the button click. There is no undo. A layout with many hours of configuration can be lost with a misclick.

### ✅ `btn-copy` badge styling inconsistency
The "Copy" button in the feature panel uses `btn-copy` class but the SCSS file only defines `.btn-clone`, `.btn-remove`, `.btn-upload`, `.btn-clear`. `btn-copy` has no style — it will render with browser defaults. Presumably it should match `.btn-clone`.

---

## Reliability

### ✅ No SSE reconnection
`SseService.stream()` calls `observer.error(err)` on any `EventSource` error, which terminates the RxJS observable permanently. `LiveDataService` logs a warning but never re-subscribes. A network blip, backend restart, or browser going idle will silently kill the live feed until the user manually toggles "Live" off and on. A retry strategy (e.g. `retryWhen` with exponential backoff, or a `visibilitychange` listener) is needed for production use.

### SSE error in one stream silently stops both
If `eventAndHeat$` errors, laptime updates continue but event/heat data freezes. If `lapTime$` errors, the chrono drifts and lane times stop updating. The two streams fail independently but there is no user-visible indication of a partial failure.

---

## Minor

- **Lane count upper bound is split between template (max 10) and no guard in `setLaneCount`** — the `+` button is disabled at 10 in the HTML but `setLaneCount` only validates `>= 1`. Symmetrical validation belongs in the store method.
- **`ZoneComponent` 100ms tick runs even when chrono is stopped** — minor but the interval fires unconditionally for the lifetime of every zone instance. Could be conditional on `chronoStopTime == null`.
- **`FeatureClipboardService` clipboard is in-memory only** — closing and reopening the config tab loses the clipboard. `localStorage` or `sessionStorage` would survive tab reloads, consistent with how other state is persisted.
- **`resolveTemplate` silently returns `''` for any missing path** — useful for render mode, but in config mode a typo in a template variable gives no feedback. A dev-mode warning or a template validator in the panel would help catch mistakes.
