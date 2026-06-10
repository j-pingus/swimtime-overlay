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

**`LayoutStore`** — persists to IndexedDB (`swimtime` DB). Holds the list of `Layout` objects (each has an array of `AnyFeature`), the currently active layout ID, and `messageTypeRules` (maps SSE message types to layout IDs + optional auto-clear durations).

**`CompetitionStore`** — persists mode/lane settings to localStorage; competition data is transient. In `config` mode it holds a fixed dummy dataset. In `live` mode it is populated by `LiveDataService`. The `chronoStartTime`/`chronoStopTime` fields on `Competition` drive the Chrono feature.

### Live data flow

`LiveDataService.start()` subscribes to two SSE streams via `SseService`:
- `/api/sse/eventAndHeat` → `setCompetition()`, next-heat loads, layout rule triggers, chrono start/stop
- `/api/sse/laptime` → `updateLaneTimes()`, `syncChrono()` (aligns chrono to the received time)

`CHRONO_START` records `Date.now()` as `chronoStartTime`. `HEAT_ARRIVED` freezes it via `chronoStopTime`. Each lap time SSE event also re-syncs `chronoStartTime` so the display matches the swimmer's received time.

### Feature system

Features are defined in `layout.model.ts` (`AnyFeature` union). The shared SVG canvas is `ZoneComponent` — it handles both interactive config (drag/resize anchors, selection) and display-only render mode via the `interactive` input.

**Adding a new feature type** requires touching:
1. `layout.model.ts` — new interface + add to `FeatureType` and `AnyFeature`
2. `zone.component.ts` — type-guard helper + rendering logic
3. `zone.component.html` — `@else if` branch in the feature loop
4. `feature-panel.component.ts` — computed + patch method + `typeLabel()`
5. `feature-panel.component.html` — config section + header label
6. `layout-config.component.ts` — `addFeature()` default construction
7. `layout-config.component.html` — button in the add-feature menu
8. `LayoutStore.migrate()` — add field defaults for any new required fields on existing persisted data

### Template resolution

`TextFeature` and `LaneFeature` use `${path.to.value}` tokens resolved by `resolveTemplate()` against the `Competition` object (for Text) or individual `Lane` objects (for Lane). The feature panel shows available variable references.

### Chrono format

`formatChrono(ms)` in `zone.component.ts` outputs `m:ss.t` (tenths of a second). The zone ticks at 100 ms. `parseTimeToMs()` in `live-data.service.ts` parses both `"ss.hh"` and `"m:ss.hh"` formats from the SSE stream.
