# Swimtime Overlay — User Manual

## Table of Contents

1. [Setup & Proxy Configuration](#1-setup--proxy-configuration)
2. [Layouts Page](#2-layouts-page)
3. [Config Page](#3-config-page)
4. [Keyboard Shortcuts](#4-keyboard-shortcuts)

---

## 1. Setup & Proxy Configuration

The overlay app is a development web server that **proxies all `/api` requests to the Swimtime server**. No separate network config is needed — the proxy is built into the dev server.

### Starting the app

```bash
npm install       # first time only
ng serve          # starts at http://localhost:4200
```

### How the proxy works

`proxy.conf.json` at the repo root defines the routing:

| Path | Target |
|------|--------|
| `/api/sse/*` | `http://localhost:8080` (with `Connection: keep-alive` for SSE streams) |
| `/api/*` | `http://localhost:8080` |

The overlay expects the Swimtime server to be running on **`localhost:8080`**. If your server runs on a different host or port, edit `proxy.conf.json`:

```json
{
  "/api/sse": {
    "target": "http://YOUR_HOST:YOUR_PORT",
    "secure": false,
    "headers": { "Connection": "keep-alive" }
  },
  "/api": {
    "target": "http://YOUR_HOST:YOUR_PORT",
    "secure": false
  }
}
```

Then restart `ng serve` for the change to take effect.

### Enabling live data

Once the app is running and the Swimtime server is reachable:

1. Open `http://localhost:4200/layouts`
2. Click the **○ Live** button in the Pool / Render section — it turns into **● Live**
3. If either SSE stream fails, an amber **⚠ Heat data** or **⚠ Lap times** badge appears next to the button

Live mode persists across page reloads. To return to preview mode, click **● Live** again.

### OBS / video capture setup

Open two browser windows:

| Window | URL | Purpose |
|--------|-----|---------|
| Config | `http://localhost:4200/layouts` | Layout management, live toggle |
| Render | `http://localhost:4200/render` | Clean output for OBS |

Point your OBS Browser Source (or screen-capture) at the **Render** window. Both windows stay in sync via BroadcastChannel — changes made in the Config window appear in the Render window instantly.

---

## 2. Layouts Page

`http://localhost:4200/layouts`

This is the main control panel. It is split into four sections.

### Pool / Render

| Control | Description |
|---------|-------------|
| **First lane** | The lane number your pool starts counting from (e.g. `0` or `1`). Adjust to match your timing system. |
| **Lanes** | Total number of lanes displayed (1–10). |
| **○ / ● Live** | Toggle between preview mode (static dummy data) and live mode (real Swimtime SSE feed). |
| **Background** | Switch the render window between **Transparent** (for OBS chroma key) and **Green** (for a solid green screen). |

### Message type associations

Rules that automatically switch the active layout when a Swimtime SSE message arrives.

| Field | Description |
|-------|-------------|
| **Message type** | The Swimtime event that triggers the switch (e.g. `START_LIST`, `HEAT_ARRIVED`, `CHRONO_START`). |
| **Layout** | The layout to activate when that message fires. |
| **Delay (s)** | Optional: wait this many seconds after the message before switching. Leave blank for immediate. |
| **Duration (s)** | Optional: automatically revert (clear the active layout) after this many seconds. Leave blank to stay until the next rule fires. |

Click **Add** to save a new rule. Click **×** on an existing rule to remove it.

### Layouts list

| Action | How |
|--------|-----|
| **Create** | Type a name in the "New layout" form and click **Create**. |
| **Activate** | Click **Use** — the render window immediately switches to this layout. The active layout shows a **● Active** badge. |
| **Configure** | Click **Configure** — opens the config editor for that layout. |
| **Preview render** | Click **▶** — opens the render view for that layout directly (without changing the active layout). |
| **Clone** | Click **⎘** — duplicates the layout with all its features. |
| **Export** | Click **↓** — downloads the layout as a `.json` file. |
| **Import** | Click **Import** — loads a `.json` file exported from another session. |
| **Delete** | Click **×** — asks for confirmation, then permanently removes the layout. |

---

## 3. Config Page

`http://localhost:4200/config/:id`

The config page has a **canvas** on the left (a 1920×1080 SVG representation of the render output) and a **feature panel** on the right.

### Canvas

The canvas shows features at a scaled-down size. Click a feature to select it. Drag a feature to reposition it. Drag the **bottom-right corner handle** to resize it.

The canvas uses dummy competition data in preview mode so you can see realistic text without being connected to a live server.

### Feature list (right panel, nothing selected)

The right panel shows all features in render order: **the bottom of the list renders on top** of the canvas.

| Action | How |
|--------|-----|
| **Reorder** | Drag the ⠿ handle to change render order (groups move as a block). |
| **Select** | Click a row to select and edit that feature. |
| **Multi-select for grouping** | Check the checkbox on two or more standalone features, then click **Group selected**. |
| **Align centres** | With multiple features checked, use the horizontal/vertical centre-align buttons to snap their centres to the average position. |
| **Paste** | If the clipboard has a copied feature, click **Paste** to place a copy. |

### Adding features

Click **+ Add feature** in the top bar and choose a type:

| Type | What it renders |
|------|-----------------|
| **Image** | A static image (upload from file or external URL). Supports rotation. |
| **Text** | A text label with template variable support. Supports rotation. |
| **Rectangle** | A filled, optionally bordered rectangle. Supports rotation. |
| **Lane text** | Repeating text rows — one row per lane, resolved against per-lane data. |
| **Flag** | Repeating national flag rows — one flag per lane. |
| **Polygon** | A freely shaped filled polygon with draggable vertices. |
| **Chrono** | A live race chronometer (`m:ss.t`). Supports rotation. |
| **Clock** | An analogue wall clock (SVG hands). |

### Feature properties (right panel, feature selected)

Every feature exposes a **Label** field (internal name shown in the list) and **Position / Size** numeric fields (in canvas pixels on the 1920×1080 grid).

Feature-specific options appear below — styling, templates, heat source, etc.

#### Text variables — Text feature

The template field accepts plain text mixed with `${variable}` tokens. The panel shows an **Unknown variable** error for any token that does not resolve against the current dummy data.

**Current event**

| Token | Value |
|-------|-------|
| `${currentEvent.number}` | Event number |
| `${currentEvent.stroke}` | Stroke name (e.g. Freestyle) |
| `${currentEvent.category}` | Category (e.g. Men) |
| `${currentEvent.distance}` | Distance (e.g. 100m) |
| `${currentEvent.countHeats}` | Total number of heats |

**Current heat**

| Token | Value |
|-------|-------|
| `${currentHeat.number}` | Heat number |

**Lane data (0-based index)**

Replace `0` with the lane index (e.g. `1` for the second lane):

| Token | Value |
|-------|-------|
| `${currentHeat.lanes.0.swimmerName}` | Swimmer's full name |
| `${currentHeat.lanes.0.club}` | Club name |
| `${currentHeat.lanes.0.nat}` | Nationality code |
| `${currentHeat.lanes.0.entryTime}` | Entry time |
| `${currentHeat.lanes.0.time}` | Live time (updated during the race) |
| `${currentHeat.lanes.0.officialTime}` | Official final time |
| `${currentHeat.lanes.0.rank}` | Final rank |

**Next heats (indices 0–2)**

| Token | Value |
|-------|-------|
| `${nextHeats.0.event}` | Next event number |
| `${nextHeats.0.heat}` | Next heat number |
| `${nextHeats.0.stroke}` | Stroke |
| `${nextHeats.0.category}` | Category |
| `${nextHeats.0.distance}` | Distance |

**Wall clock**

| Token | Value |
|-------|-------|
| `${HH}` | Current hour (00–23) |
| `${MM}` | Current minute (00–59) |
| `${SS}` | Current second (00–59) |

Example: `${HH}:${MM}:${SS}` renders as `14:32:07`.

#### Text variables — Lane text feature

The template is evaluated **once per lane** and resolved against the individual lane object. Use these tokens (no path prefix needed):

| Token | Value |
|-------|-------|
| `${swimmerName}` | Swimmer's full name |
| `${club}` | Club name |
| `${nat}` | Nationality code |
| `${entryTime}` | Entry time |
| `${time}` | Live time |
| `${officialTime}` | Official final time |
| `${rank}` | Rank |
| `${distance}` | Distance from last lap-time event |
| `${number}` | Lane number |

The panel includes clickable **Use** buttons next to each token to append it to the template without typing.

### Groups

Select a group to see its member list and rotation controls. Groups whose children all support rotation expose an **Angle** field — changing it rotates all children around the group's bounding-box centre.

---

## 4. Keyboard Shortcuts

All shortcuts work when **focus is on the canvas** (not in a text input, select, or textarea).

### Canvas navigation

| Key | Action |
|-----|--------|
| `Arrow keys` | Move selected feature 1 px |
| `Shift + Arrow keys` | Move selected feature 10 px |
| `Alt + Arrow Left / Right` | Rotate selected feature −1° / +1° (text, image, rect, chrono, group) |
| `Shift + Alt + Arrow Left / Right` | Rotate −10° / +10° |
| `Alt + Arrow Up / Down` | Resize selected feature height −1 / +1 px |
| `Alt + Arrow Left / Right` (resize) | Resize selected feature width −1 / +1 px |

> **Note:** `Alt + Arrow` triggers rotation when `dx ≠ 0` and resize when `dy ≠ 0`.

### Feature management

| Key | Action |
|-----|--------|
| `Delete` or `Backspace` | Delete selected feature (keeps group shell, removes only the item) |
| `Shift + Delete` / `Shift + Backspace` | Delete group **and all its children** |
| `Cmd/Ctrl + C` | Copy selected feature (or group with children) to clipboard |
| `Cmd/Ctrl + V` | Paste clipboard as a new feature (offset applied) |
