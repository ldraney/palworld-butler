# PAL-E

**P**alworld **A**nalysis and **L**ogistics: **E**xpert

PAL-E is an AI companion that **grows with you** in Palworld. Unlike static wikis or tip lists, PAL-E starts fresh, observes your gameplay through save files, builds its own knowledge from real experiences, and becomes YOUR personalized Palworld expert.

## Philosophy

- **No pre-loaded knowledge** - PAL-E learns by observing, not from datamined tables
- **Grows over time** - Every session adds to its understanding
- **Adapts to updates** - Game changes don't break it; it learns the new reality
- **Goal-oriented** - Helps you optimize toward whatever YOU want to achieve
- **Quantitative when possible** - Derives actual numbers from observations, not vibes

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  OBSERVATION LAYER                                      │
│  Deep save file parsing → Event stream                  │
│  "Caught Lamball" "Built farm" "Bred X+Y=Z"            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  MEMORY LAYER                                           │
│  Persistent storage of observations over time           │
│  Patterns derived from experience                       │
│  What worked, what didn't, experiments tried           │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  REASONING LAYER (LLM)                                  │
│  Current state + Memory + Goals → Suggestions           │
│  "Based on what I've seen, try this next..."           │
└─────────────────────────────────────────────────────────┘
```

## What PAL-E Observes

Save files update every ~30 seconds. PAL-E detects changes between saves:

- **Pals**: Catches, releases, deaths, breeding results, level changes
- **Bases**: New structures, Pal assignments, production output
- **Inventory**: Resource accumulation, item crafting, consumption
- **Player**: Level, location, unlocks, achievements
- **World**: Time progression, weather patterns, events

## What PAL-E Remembers

- Your breeding experiments and results
- Which Pals you've assigned to which tasks
- Your base layouts and efficiency observations
- Goals you've set and progress toward them
- Session summaries and trajectory over time

## What PAL-E Cannot See

- Real-time gameplay (only snapshots at save time)
- What's on your screen
- Combat details (only outcomes if they affect saves)
- Moment-to-moment movement

## Goal System

You tell PAL-E what you're working toward:
- "I want to catch Anubis"
- "I want to optimize my berry farm"
- "I want to breed a perfect Relaxaurus"

PAL-E tracks progress, suggests next steps based on observed patterns, and celebrates milestones.

## Character

PAL-E is:
- **Curious** - Genuinely interested in learning the game WITH you
- **Honest** - Says "I don't know yet" when it hasn't observed something
- **Helpful** - Focused on YOUR goals, not generic advice
- **Growing** - Gets smarter the more you play together

## Technical Stack

- **Save Parsing**: `palworld-save-tools` (MRHRTZ fork for Oodle decompression)
- **File Watching**: Node.js with `chokidar`
- **Memory**: JSON-based persistent storage (`save_history.json`)
- **Reasoning**: Claude API for intelligent suggestions
- **Interface**: WebSocket for real-time updates, HTTP API for queries

## Files

| File | Purpose |
|------|---------|
| `snapshot.py` | Deep save parsing, diff detection, SaveEvent tracking |
| `history.py` | Persistent save history, pattern learning, trend detection |
| `server.js` | Node.js file watcher + WebSocket server |
| `parse_save.py` | Legacy Python save parser |
| `overlay.html` | Optional display overlay |

## Data Extracted Per Save

**Players:**
- Name, Level, UID

**Pals (full detail):**
- Species, Level, Experience
- IVs (HP, Defense, Attack)
- Gender, Passives
- Owner, Instance ID

**World:**
- Base count
- Game time
- Save metadata

## Save Intelligence

PAL-E classifies each save and infers activity:

| Save Type | Detection | Example |
|-----------|-----------|---------|
| `autosave` | 9-12 min interval | Regular gameplay |
| `manual` | <2 min or >12 min | After important event |

| Activity | Detection | Example |
|----------|-----------|---------|
| `combat` | Level ups detected | Fighting wild Pals |
| `catching` | New Pals in roster | Catching spree |
| `building` | Base count changed | Construction |
| `managing` | Releases, no catches | Organizing Pals |

## API

- `ws://localhost:8765` - WebSocket events
- `GET http://localhost:8766/status` - Current world state
- `POST http://localhost:8766/say` - Manual message

## Save Location

```
%LOCALAPPDATA%\Pal\Saved\SaveGames\<SteamID>\<WorldID>\Level.sav
```

## Status

- [x] Basic save file watching
- [x] Shallow parsing (player count, pal count, guild)
- [x] Deep parsing (individual Pals, stats, IVs, passives)
- [x] Event diff detection ("what changed?")
- [x] Memory/observation storage (history.py)
- [x] Save type classification
- [x] Activity inference
- [x] Pattern learning
- [ ] Goal tracking system
- [ ] LLM integration for reasoning/suggestions
