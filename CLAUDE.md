# PAL-E

**P**alworld **A**nalysis and **L**ogistics: **E**xpert

PAL-E is an AI companion ecosystem for Palworld — combining real-time observation, strategic coaching, and gameplay optimization into a modular toolkit.

## Ecosystem Overview

| Component | Repository | Role | Status |
|-----------|------------|------|--------|
| **pal-e** | [ldraney/pal-e](https://github.com/ldraney/pal-e) | Dashboard & Registry | Active |
| **pal-e-observer** | [ldraney/pal-e-observer](https://github.com/ldraney/pal-e-observer) | Save file watching & event detection | Active |
| **pal-e-expert** | [ldraney/pal-e-expert](https://github.com/ldraney/pal-e-expert) | MCP coaching tools (breeding, boss strategy) | Planned |
| **pal-e-analyzer** | [ldraney/pal-e-analyzer](https://github.com/ldraney/pal-e-analyzer) | Raw data analysis from observer releases | Planned |
| **pal-e-community** | [ldraney/pal-e-community](https://github.com/ldraney/pal-e-community) | Community goals, trends, meta awareness | Planned |

## This Repository (pal-e)

This repo serves as the **hub** of the PAL-E ecosystem:

- **Web Dashboard** — Browser UI at `http://localhost:8766/` showing world state
- **Component Registry** — `registry.json` listing all PAL-E components
- **Documentation** — Central place for ecosystem-level docs

## Quick Start

```bash
# 1. Start the Observer service first (in pal-e-observer repo)
cd ../pal-e-observer
npm install
npm start

# 2. Start the Dashboard (in this repo)
npm install
npm start

# 3. Open browser
# http://localhost:8766
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  PALWORLD GAME                                              │
│  Writes save files on autosave (~10 min) or manual save     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  PAL-E OBSERVER (pal-e-observer repo)                       │
│  Watches save files, parses Level.sav, detects changes      │
│  WebSocket: ws://localhost:8765                             │
│  REST API:  http://localhost:8764                           │
└─────────────────────────────────────────────────────────────┘
                              ↓ WebSocket events
┌─────────────────────────────────────────────────────────────┐
│  PAL-E DASHBOARD (this repo)                                │
│  Connects to Observer, relays events to browser             │
│  HTTP:      http://localhost:8766                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  BROWSER                                                    │
│  Displays world state, players, pals, activity feed         │
└─────────────────────────────────────────────────────────────┘
```

## Dashboard Features

- World ID and host player detection
- Player list with levels and HOST badge
- Pal count, base count
- Live activity feed via WebSocket
- Auto-reconnect to Observer on disconnect
- Auto-refreshing timestamps

## Files

| File | Purpose |
|------|---------|
| `server.js` | Dashboard server - connects to Observer, serves web UI |
| `registry.json` | Machine-readable list of PAL-E ecosystem components |
| `overlay.html` | OBS overlay for streaming (connects directly to Observer) |

## How It Works

1. **Observer** watches Palworld save files for changes
2. When `Level.sav` changes, Observer parses it with Python and detects events
3. Observer broadcasts events via WebSocket (port 8765)
4. **Dashboard** connects to Observer as a WebSocket client
5. Dashboard relays events to browser clients
6. Browser displays world state and activity feed

## REST API

| Endpoint | Description |
|----------|-------------|
| `GET /` | Dashboard web UI |
| `GET /status` | Current world state and observer connection status |

## Dependencies

- Requires **pal-e-observer** to be running
- Node.js with `ws` package

## Component Details

### pal-e-observer

Standalone Node.js service that:
- Watches all `.sav` files in Palworld SaveGames directory
- Deep parses `Level.sav` using Python (`snapshot.py`)
- Detects events: catches, releases, level ups, player joins/leaves
- Broadcasts events via WebSocket

### pal-e-expert (Planned)

MCP Server providing coaching tools:
- Breeding calculator (offspring + passive probability)
- Boss strategy recommendations
- Base optimization suggestions
- Combat build recommendations

## Status

- [x] Web dashboard
- [x] World ID detection
- [x] Host/client detection
- [x] Observer service (standalone)
- [x] Dashboard ↔ Observer integration
- [ ] Expert MCP server
- [ ] Analyzer data pipeline
- [ ] Community trends tracking
