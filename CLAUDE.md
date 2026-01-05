# PAL-E

**P**alworld **A**nalysis and **L**ogistics: **E**xpert

PAL-E is your AI companion for Palworld - a JARVIS-style assistant that monitors your gameplay, tracks your progress, and helps you stay focused on your goals.

## Purpose

Like JARVIS for Iron Man, PAL-E amplifies your effectiveness:

| JARVIS Function | PAL-E Equivalent |
|-----------------|------------------|
| Real-time analysis | Track world state, Pal counts, player activity |
| System monitoring | Base production, Pal assignments, resources |
| Research assistant | Breeding combos, drop tables, spawn locations |
| Memory | Remember your goals, what you're working toward |
| Predictive | "If you breed X + Y, you get Z" |
| Companion | Good conversation while you play |

## Core Functions

- **Guide** - Helps you stay on track with goals and missions
- **Analyst** - Tracks progress, inventory, Pals, bases
- **Companion** - Conversation and context while you play
- **Memory** - Remembers what you're working toward

## Current Capabilities

**Save File Monitoring:**
- Watches `Level.sav` for world changes
- Tracks players online/offline
- Detects Pal count changes
- Parses save data via palworld-save-tools

**Architecture:**
- `server.js` - Node.js file watcher + WebSocket server
- `parse_save.py` - Python save parser (Oodle decompression)
- `overlay.html` - Optional display overlay

**API:**
- `ws://localhost:8765` - WebSocket events
- `GET http://localhost:8766/status` - Current world state
- `POST http://localhost:8766/say` - Manual message

## Roadmap

**Phase 1 - Deep Save Parsing**
- [ ] Extract individual Pal data (species, level, skills, IVs)
- [ ] Track base locations and structures
- [ ] Monitor inventory and storage
- [ ] Detect achievements and boss kills

**Phase 2 - Game Knowledge**
- [ ] Palworld wiki integration
- [ ] Breeding calculator and recommendations
- [ ] Pal stat lookups and comparisons
- [ ] Item/recipe database

**Phase 3 - Smart Assistance**
- [ ] Goal tracking ("I want to catch Anubis")
- [ ] Session summaries ("Today you caught 5 Pals, built 2 structures")
- [ ] Contextual tips based on game state
- [ ] Mission/quest tracking

## Technical Notes

**Dependencies:**
- Node.js: chokidar, ws
- Python: palworld-save-tools (MRHRTZ fork with Oodle support)

**Save Location:**
```
%LOCALAPPDATA%\Pal\Saved\SaveGames\<SteamID>\<WorldID>\Level.sav
```

## Character

PAL-E is helpful but not overbearing:
- Concise - Brief, useful info
- Knowledgeable - Palworld expert
- Supportive - Helps you achieve your goals
- Unobtrusive - Speaks when meaningful, not constantly
