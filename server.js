const chokidar = require('chokidar');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');

// Configuration
const CONFIG = {
  wsPort: 8765,
  // Palworld save directory
  savePath: path.join(os.homedir(), 'AppData', 'Local', 'Pal', 'Saved', 'SaveGames'),
  // Debounce rapid file changes - longer for multiplayer servers
  debounceMs: 30000,
  // Minimum time between auto-comments
  commentCooldownMs: 60000,
  // Python parser script
  parserScript: path.join(__dirname, 'parse_save.py'),
};

// Track last event time to debounce
let lastEventTime = 0;
let lastCommentTime = 0;
let pendingChanges = [];

// Track world state for comparison
let worldState = {
  players: [],
  palCount: 0,
  lastParsed: null,
  worldId: null,
  hostPlayer: null,
};

// Parse save file using Python script
function parseSaveFile(savePath) {
  return new Promise((resolve, reject) => {
    execFile('python', [CONFIG.parserScript, savePath], { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[PAL-E] Parse error: ${error.message}`);
        reject(error);
        return;
      }
      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (e) {
        console.error(`[PAL-E] JSON parse error: ${e.message}`);
        reject(e);
      }
    });
  });
}

// PAL-E commentary generator
const pale = {
  greetings: [
    "PAL-E online. Monitoring Palpagos.",
    "Connected. Ready to assist.",
    "Save watcher active. Let's get to work.",
  ],

  saveEvents: [
    "World saved.",
    "Progress recorded.",
    "Autosave detected.",
    "Checkpoint.",
  ],

  playerSaveEvents: [
    "Player data synced.",
    "Character state updated.",
  ],

  worldEvents: [
    "World state changed.",
    "Something shifted in Palpagos.",
  ],

  newPlayerEvents: [
    "{player} joined the world.",
    "{player} is now online.",
    "New player: {player}",
  ],

  playerLeftEvents: [
    "{player} left the world.",
    "{player} disconnected.",
  ],

  palGainEvents: [
    "Pal count: {count} (+{diff})",
    "New Pal acquired. Total: {count}",
    "Collection grows to {count} Pals.",
  ],

  palLossEvents: [
    "Pal count: {count} ({diff})",
    "Pal roster decreased to {count}.",
  ],

  statusReport: [
    "World: {players} players, {pals} Pals",
    "Status: {players} online, {pals} Pals total",
  ],

  getRandomComment(category, replacements = {}) {
    const comments = this[category];
    if (!comments) return "Event detected.";
    let comment = comments[Math.floor(Math.random() * comments.length)];
    for (const [key, value] of Object.entries(replacements)) {
      comment = comment.replace(`{${key}}`, value);
    }
    return comment;
  },

  // Analyze parsed save data and generate appropriate commentary
  analyzeWorldChanges(newData, oldState) {
    const events = [];

    if (!newData.success) return events;

    // Check for new players
    for (const player of newData.players) {
      if (!oldState.players.includes(player)) {
        events.push({
          type: 'new_player',
          comment: this.getRandomComment('newPlayerEvents', { player }),
          priority: 1,
        });
      }
    }

    // Check for players who left
    for (const player of oldState.players) {
      if (!newData.players.includes(player)) {
        events.push({
          type: 'player_left',
          comment: this.getRandomComment('playerLeftEvents', { player }),
          priority: 1,
        });
      }
    }

    // Check for Pal count changes
    const palDiff = newData.pal_count - oldState.palCount;
    if (palDiff > 0 && oldState.palCount > 0) {
      events.push({
        type: 'pal_gained',
        comment: this.getRandomComment('palGainEvents', { count: newData.pal_count, diff: palDiff }),
        priority: 2,
      });
    } else if (palDiff < 0) {
      events.push({
        type: 'pal_lost',
        comment: this.getRandomComment('palLossEvents', { count: newData.pal_count, diff: palDiff }),
        priority: 2,
      });
    }

    // If no specific events but world changed, use generic
    if (events.length === 0 && oldState.lastParsed) {
      events.push({
        type: 'world_save',
        comment: this.getRandomComment('saveEvents'),
        priority: 3,
      });
    }

    return events.sort((a, b) => a.priority - b.priority);
  },

  analyzeFileChange(filePath) {
    const fileName = path.basename(filePath);
    const dirName = path.dirname(filePath);

    if (fileName === 'Level.sav') {
      return { type: 'world_save', comment: this.getRandomComment('worldEvents') };
    }
    if (fileName === 'LocalData.sav') {
      return { type: 'local_save', comment: this.getRandomComment('saveEvents') };
    }
    if (fileName.endsWith('.sav') && dirName.includes('Players')) {
      return { type: 'player_save', comment: this.getRandomComment('playerSaveEvents') };
    }
    if (fileName === 'LevelMeta.sav') {
      return { type: 'meta_save', comment: this.getRandomComment('saveEvents') };
    }

    return { type: 'unknown', comment: null };
  }
};

// WebSocket server
const wss = new WebSocket.Server({ port: CONFIG.wsPort });

console.log(`[PAL-E] WebSocket server running on ws://localhost:${CONFIG.wsPort}`);

// Broadcast to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle new connections
wss.on('connection', (ws) => {
  console.log('[PAL-E] Client connected');

  // Send greeting
  ws.send(JSON.stringify({
    type: 'greeting',
    comment: pale.getRandomComment('greetings'),
    timestamp: new Date().toISOString(),
  }));

  ws.on('close', () => {
    console.log('[PAL-E] Client disconnected');
  });
});

// Process pending changes (debounced)
async function processPendingChanges() {
  if (pendingChanges.length === 0) return;

  // Check if Level.sav was among the changes
  const levelSavPath = pendingChanges.find(fp => path.basename(fp) === 'Level.sav');

  if (levelSavPath) {
    // Parse the save file for detailed analysis
    try {
      console.log('[PAL-E] Parsing Level.sav for world changes...');
      const saveData = await parseSaveFile(levelSavPath);

      if (saveData.success) {
        const events = pale.analyzeWorldChanges(saveData, worldState);

        // Update world state
        worldState.players = saveData.players || [];
        worldState.palCount = saveData.pal_count || 0;
        worldState.lastParsed = new Date().toISOString();
        worldState.worldId = saveData.world_id || null;
        worldState.hostPlayer = saveData.host_player || null;

        console.log(`[PAL-E] World state: ${worldState.players.length} players, ${worldState.palCount} Pals`);

        // Broadcast events
        const now = Date.now();
        if (events.length > 0 && (now - lastCommentTime > CONFIG.commentCooldownMs)) {
          lastCommentTime = now;
          const event = events[0]; // Best priority event
          broadcast({
            type: 'game_event',
            eventType: event.type,
            comment: event.comment,
            timestamp: new Date().toISOString(),
            worldState: {
              players: worldState.players,
              palCount: worldState.palCount,
            },
          });
          console.log(`[PAL-E] ${event.comment}`);
        }
      }
    } catch (err) {
      console.error('[PAL-E] Save parsing failed:', err.message);
      // Fall back to simple analysis
      fallbackAnalysis();
    }
  } else {
    // No Level.sav, use simple analysis
    fallbackAnalysis();
  }

  pendingChanges = [];
}

// Fallback to simple file-based analysis
function fallbackAnalysis() {
  const analyses = pendingChanges.map(fp => pale.analyzeFileChange(fp));
  const priority = ['world_save', 'player_save', 'local_save', 'meta_save'];
  let bestEvent = null;

  for (const p of priority) {
    const found = analyses.find(a => a.type === p && a.comment);
    if (found) {
      bestEvent = found;
      break;
    }
  }

  const now = Date.now();
  if (bestEvent && bestEvent.comment && (now - lastCommentTime > CONFIG.commentCooldownMs)) {
    lastCommentTime = now;
    broadcast({
      type: 'game_event',
      eventType: bestEvent.type,
      comment: bestEvent.comment,
      timestamp: new Date().toISOString(),
      filesChanged: pendingChanges.length,
    });
    console.log(`[PAL-E] ${bestEvent.comment}`);
  }
}

// File watcher
console.log(`[PAL-E] Watching: ${CONFIG.savePath}`);

const watcher = chokidar.watch(CONFIG.savePath, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 1000,
    pollInterval: 100,
  },
});

watcher.on('change', (filePath) => {
  const now = Date.now();

  // Add to pending changes
  if (!pendingChanges.includes(filePath)) {
    pendingChanges.push(filePath);
  }

  // Debounce: only process after quiet period
  if (now - lastEventTime > CONFIG.debounceMs) {
    lastEventTime = now;
    setTimeout(processPendingChanges, CONFIG.debounceMs);
  }
});

watcher.on('add', (filePath) => {
  console.log(`[PAL-E] New file detected: ${path.basename(filePath)}`);
});

watcher.on('error', (error) => {
  console.error(`[PAL-E] Watcher error: ${error}`);
});

watcher.on('ready', async () => {
  console.log('[PAL-E] Initial scan complete. Loading current world state...');

  // Find and parse the most recent Level.sav for initial state
  const fs = require('fs');
  const findLevelSav = (dir) => {
    let newest = null;
    let newestTime = 0;
    const walk = (d) => {
      try {
        for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
          const fullPath = path.join(d, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name === 'Level.sav') {
            const stat = fs.statSync(fullPath);
            if (stat.mtimeMs > newestTime) {
              newestTime = stat.mtimeMs;
              newest = fullPath;
            }
          }
        }
      } catch (e) { /* ignore permission errors */ }
    };
    walk(dir);
    return newest;
  };

  const levelSav = findLevelSav(CONFIG.savePath);
  if (levelSav) {
    try {
      console.log(`[PAL-E] Found save: ${levelSav}`);
      const saveData = await parseSaveFile(levelSav);
      if (saveData.success) {
        worldState.players = saveData.players || [];
        worldState.palCount = saveData.pal_count || 0;
        worldState.lastParsed = new Date().toISOString();
        worldState.worldId = saveData.world_id || null;
        worldState.hostPlayer = saveData.host_player || null;

        // Display world identification
        if (worldState.worldId) {
          console.log(`[PAL-E] World ID: ${worldState.worldId}`);
        }
        if (worldState.hostPlayer) {
          console.log(`[PAL-E] Host: ${worldState.hostPlayer}`);
        }
        console.log(`[PAL-E] Initial state: ${worldState.players.length} players, ${worldState.palCount} Pals`);
        console.log(`[PAL-E] Players: ${worldState.players.join(', ')}`);
      }
    } catch (err) {
      console.error('[PAL-E] Initial parse failed:', err.message);
    }
  }

  console.log('[PAL-E] Awaiting gameplay events...');
  console.log('[PAL-E] Open overlay.html in OBS browser source to begin.');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[PAL-E] Standing down, sir. Good evening.');
  watcher.close();
  wss.close();
  process.exit(0);
});

// Simple HTTP server for manual commentary
const http = require('http');

const httpServer = http.createServer((req, res) => {
  // CORS headers for browser access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  if (req.method === 'GET' && req.url === '/status') {
    // Return current world state
    const status = {
      worldState: {
        worldId: worldState.worldId,
        hostPlayer: worldState.hostPlayer,
        players: worldState.players,
        palCount: worldState.palCount,
        lastParsed: worldState.lastParsed,
      },
      uptime: process.uptime(),
      comment: pale.getRandomComment('statusReport', {
        players: worldState.players.length,
        pals: worldState.palCount,
      }),
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  } else if (req.method === 'POST' && req.url === '/say') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const comment = body.trim();
      if (comment) {
        broadcast({
          type: 'manual',
          comment: comment,
          timestamp: new Date().toISOString(),
        });
        console.log(`[PAL-E] ${comment}`);
        res.writeHead(200);
        res.end('OK');
      } else {
        res.writeHead(400);
        res.end('Empty message');
      }
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

httpServer.listen(8766, () => {
  console.log('[PAL-E] HTTP API on http://localhost:8766');
  console.log('[PAL-E]   GET  /status - Current world state');
  console.log('[PAL-E]   POST /say    - Manual commentary');
});
