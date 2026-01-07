# PAL-E

**P**alworld **A**nalysis and **L**ogistics: **E**xpert

PAL-E is an AI companion ecosystem for Palworld — combining real-time observation, strategic coaching, and gameplay optimization into a modular toolkit.

## Ecosystem Overview

PAL-E is split into three independent components:

| Component | Repository | Role | Status |
|-----------|------------|------|--------|
| **pal-e** | [ldraney/pal-e](https://github.com/ldraney/pal-e) | Dashboard & Registry | Active |
| **pal-e-observer** | [ldraney/pal-e-observer](https://github.com/ldraney/pal-e-observer) | Save file watching & event detection | Planned |
| **pal-e-expert** | [ldraney/pal-e-expert](https://github.com/ldraney/pal-e-expert) | MCP coaching tools (breeding, boss strategy) | Planned |

## This Repository (pal-e)

This repo serves as the **hub** of the PAL-E ecosystem:

- **Web Dashboard** — Browser UI at `http://localhost:8766/` showing world state
- **Component Registry** — `registry.json` listing all PAL-E components
- **Documentation** — Central place for ecosystem-level docs

### Dashboard Features

- World ID and host player detection
- Player list with levels
- Pal count, base count
- Live activity feed via WebSocket
- Auto-refreshing timestamps

### Running the Dashboard

```bash
npm install
node server.js
# Open http://localhost:8766 in browser
```

## Component Details

### pal-e-observer

Watches Palworld save files and detects changes:
- Deep save parsing (Pals, stats, IVs, passives)
- Event detection (catches, releases, level ups)
- Save type classification (autosave vs manual)
- Activity inference (combat, catching, building)
- WebSocket broadcasting of events

### pal-e-expert

MCP Server providing coaching tools:
- Breeding calculator (offspring + passive probability)
- Boss strategy recommendations
- Base optimization suggestions
- Combat build recommendations
- Progress tracking

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PAL-E DASHBOARD (this repo)                            │
│  Web UI for monitoring world state                      │
│  http://localhost:8766                                  │
└─────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐     ┌─────────────────────────────┐
│  PAL-E OBSERVER     │     │  PAL-E EXPERT               │
│  Save file watching │     │  MCP coaching tools         │
│  Event detection    │     │  Breeding, bosses, bases    │
│  WebSocket events   │     │  Claude-native integration  │
└─────────────────────┘     └─────────────────────────────┘
```

## Registry

See `registry.json` for the machine-readable component list.

## Development

Each component is developed independently. See individual repos for contribution guidelines.

## Status

- [x] Web dashboard
- [x] World ID detection
- [x] Host/client detection
- [ ] Observer service (standalone)
- [ ] Expert MCP server
- [ ] Dashboard ↔ Observer integration
