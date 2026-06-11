# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
ng serve          # dev server at http://localhost:4200 (proxies /api to localhost:8080)
ng build          # production build → dist/
ng test           # run unit tests with Vitest
npx tsc --noEmit  # type-check without emitting (run after every change)
```

## Architecture

This is an Angular 21 app that renders live swimming competition data as a broadcast overlay. It is designed to run in **two separate browser windows**:

- **Config window** (`/layouts`, `/config/:id`) — layout editor where you position and style features on a 1920×1080 canvas.
- **Render window** (`/render`) — clean output, no UI chrome, intended for OBS/video capture.

State is kept in sync between windows via **BroadcastChannel** (see `LayoutSyncService`, `CompetitionSyncService`). Every local store mutation is broadcast; `applyRemoteState` consumes incoming messages without re-broadcasting.

### Stores

**`LayoutStore`** — persists to IndexedDB (`swimtime` DB). Holds the list of `Layout` objects (each has an array of `AnyFeature`), the currently active layout ID, and `messageTypeRules` (maps SSE message types to layout IDs + optional auto-clear durations). Schema migrations are version-gated via `SCHEMA_VERSION` / `migrate()`.

**`CompetitionStore`** — persists mode/lane settings to localStorage; competition data is transient. In `config` mode it holds a fixed dummy dataset. In `live` mode it is populated by `LiveDataService`. The `chronoStartTime`/`chronoStopTime` fields on `Competition` drive the Chrono feature.

### Live data flow

`LiveDataService.start()` subscribes to two SSE streams via `SseService`:
- `/api/sse/eventAndHeat` → `setCompetition()`, next-heat loads, layout rule triggers, chrono start/stop
- `/api/sse/laptime` → `updateLaneTimes()`, `syncChrono()` (aligns chrono to the received time)

`CHRONO_START` records `Date.now()` as `chronoStartTime`. `HEAT_ARRIVED` freezes it via `chronoStopTime`. `START_LIST` resets the chrono for the new heat. Each lap time SSE event re-syncs `chronoStartTime` so the display matches the swimmer's received time.

`LiveDataService` exposes `sseEventAndHeatOk` and `sseLapTimeOk` computed signals. The layout list shows an amber warning badge next to the Live button when either stream errors. On page reload, `APP_INITIALIZER` in `app.config.ts` calls `liveData.start()` automatically if the persisted mode is `'live'`.

### Feature system

Features are defined in `layout.model.ts` (`AnyFeature` union). The SVG canvas is split into two components:

- **`ZoneSurfaceComponent`** (`zone/zone-surface.component.*`) — pure rendering: owns the `<svg>`, all type guards, rendering helpers, and the 100ms chrono tick. Accepts `features`, `groupBoundsMap`, `selectedFeatureId`, `interactive` as inputs; emits typed events (`bgClick`, `featureClick`, `moveStart`, `resizeStart`, `pointDragStart`). Used directly by `RenderComponent`.
- **`ZoneComponent`** (`zone/zone.component.*`) — drag-interaction wrapper: owns drag state, computes `displayFeatures` (merging live drag preview) and `groupBoundsMap`, handles `@HostListener` mouse events, calls `ZoneSurfaceComponent.toSVGCoords()` for coordinate conversion. Used by the config editor.

**Adding a new feature type** requires touching:
1. `layout.model.ts` — new interface + add to `FeatureType` and `AnyFeature`
2. `zone-surface.component.ts` — type-guard helper + rendering helpers
3. `zone-surface.component.html` — `@else if` branch in the feature loop; add `<clipPath>` to the `<defs>` block if the feature clips text
4. `feature-panel.component.ts` — computed + patch method + `typeLabel()`
5. `feature-panel.component.html` — config section + header label
6. `layout-config.component.ts` — `addFeature()` default construction
7. `layout-config.component.html` — button in the add-feature menu
8. `LayoutStore.migrate()` — add field defaults for any new required fields on existing persisted data

### Template resolution

`TextFeature` and `LaneFeature` use `${path.to.value}` tokens resolved by `resolveTemplate()` in `core/utils/template.util.ts` against the `Competition` object (for Text) or individual `Lane` objects (for Lane). `findUnresolvedTokens()` in the same file identifies missing paths; the feature panel uses it to show inline validation errors when a token doesn't exist in the dummy competition data.

### Chrono format

`formatChrono(ms)` in `zone-surface.component.ts` outputs `m:ss.t` (tenths of a second). The 100ms tick in `ZoneSurfaceComponent` is skipped when `chronoStopTime` is non-null to avoid unnecessary re-renders after a heat ends. `parseTimeToMs()` in `live-data.service.ts` parses `"ss.hh"`, `"m:ss.hh"`, `"ss"`, and `"m:ss"` formats from the SSE stream.

### API surface

`ApiService` exposes exactly two methods: `getCurrentEventAndHeat()` and `getNextHeats()`. `api.models.ts` defines only the types the app consumes: `EventAndHeatDto`, `LaneDto`, `LaptimeDto`, `SwimTimeMessageType`, `ALL_MESSAGE_TYPES`.

### Feature clipboard

`FeatureClipboardService` backs the clipboard with `sessionStorage` (key `swimtime_clipboard`) so copied features survive a tab reload. The clipboard is scoped to the tab and cleared when the tab closes.
