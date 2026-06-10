# Swimtime Overlay

A browser-based graphics overlay for live swimming competitions, designed to be captured by OBS or similar broadcast software. It connects to a running [Swimtime](https://github.com/CrazyFox04/JavaSwimTime) Java backend via Server-Sent Events and displays race data — lane lists, live lap times, event info, and a running chronometer — on a 1920×1080 canvas.

## How it works

The app runs in **two browser windows simultaneously**:

- **Config window** (`/layouts`, `/config/:id`) — drag-and-drop layout editor. Position and style text, images, rectangles, lane grids, polygons, and chrono displays on the canvas. Changes sync instantly to the render window via BroadcastChannel.
- **Render window** (`/render`) — clean full-screen output with no UI chrome. Point OBS at this window with a Browser Source.

Layouts and settings are persisted locally in IndexedDB. No account or server is needed to build layouts; the dummy data mode lets you style everything without a live backend.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend URL

Open `proxy.conf.json` and set the `target` values to the address of your running Swimtime Java server:

```json
{
  "/api/sse": {
    "target": "http://localhost:8080",
    "secure": false,
    "headers": { "Connection": "keep-alive" }
  },
  "/api": {
    "target": "http://localhost:8080",
    "secure": false
  }
}
```

Replace `http://localhost:8080` with the actual host and port if Swimtime is running on a different machine.

### 3. Start the dev server

```bash
npm start
```

The app opens at `http://localhost:4200`. Open a second tab to `http://localhost:4200/render` for the output window.

## Commands

| Command | Description |
|---|---|
| `npm start` | Dev server with live reload |
| `npm run build` | Production build → `dist/` |
| `npm test` | Unit tests (Vitest) |
| `npx tsc --noEmit` | Type-check without building |

## Live data

Once the dev server is running and the Swimtime backend is reachable, go to the layout list page and click **Go Live**. The app will:

- Subscribe to SSE streams for event/heat updates and lap times
- Automatically switch layouts based on message type rules you configure (e.g. show a specific layout on `START_LIST`, auto-clear after N seconds)
- Drive the Chrono feature from `CHRONO_START` / `HEAT_ARRIVED` events, with each incoming lap time keeping the display aligned
