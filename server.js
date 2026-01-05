const chokidar = require('chokidar');
const WebSocket = require('ws');
const path = require('path');
const os = require('os');

// Configuration
const CONFIG = {
  wsPort: 8765,
  // Palworld save directory
  savePath: path.join(os.homedir(), 'AppData', 'Local', 'Pal', 'Saved', 'SaveGames'),
  // Debounce rapid file changes - longer for multiplayer servers
  debounceMs: 30000,
  // Minimum time between auto-comments
  commentCooldownMs: 60000,
};

// Track last event time to debounce
let lastEventTime = 0;
let lastCommentTime = 0;
let pendingChanges = [];

// Butler commentary generator
const butler = {
  greetings: [
    "Good evening, sir. I've taken my post.",
    "At your service, sir. All systems are nominal.",
    "The butler stands ready. Shall we begin?",
  ],

  saveEvents: [
    "I notice the world has been preserved, sir. A prudent autosave.",
    "Your progress has been dutifully recorded.",
    "The realm persists. Autosave complete.",
    "Another checkpoint secured, sir.",
    "Your adventures have been committed to the archives.",
  ],

  playerSaveEvents: [
    "Your character's state has been noted, sir.",
    "Personal progress recorded. Your Pals remain accounted for.",
    "Player data synchronized. All is in order.",
  ],

  worldEvents: [
    "The world state has shifted. Something of note has occurred.",
    "I detect changes in the realm, sir.",
    "The winds of change blow through Palpagos.",
  ],

  getRandomComment(category) {
    const comments = this[category];
    if (!comments) return "An event has occurred, sir.";
    return comments[Math.floor(Math.random() * comments.length)];
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

console.log(`[ButlerBot] WebSocket server running on ws://localhost:${CONFIG.wsPort}`);

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
  console.log('[ButlerBot] Client connected');

  // Send greeting
  ws.send(JSON.stringify({
    type: 'greeting',
    comment: butler.getRandomComment('greetings'),
    timestamp: new Date().toISOString(),
  }));

  ws.on('close', () => {
    console.log('[ButlerBot] Client disconnected');
  });
});

// Process pending changes (debounced)
function processPendingChanges() {
  if (pendingChanges.length === 0) return;

  // Analyze all pending changes
  const analyses = pendingChanges.map(fp => butler.analyzeFileChange(fp));

  // Pick the most significant event
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
    console.log(`[ButlerBot] ${bestEvent.comment}`);
  }

  pendingChanges = [];
}

// File watcher
console.log(`[ButlerBot] Watching: ${CONFIG.savePath}`);

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
  console.log(`[ButlerBot] New file detected: ${path.basename(filePath)}`);
});

watcher.on('error', (error) => {
  console.error(`[ButlerBot] Watcher error: ${error}`);
});

watcher.on('ready', () => {
  console.log('[ButlerBot] Initial scan complete. Awaiting gameplay events...');
  console.log('[ButlerBot] Open overlay.html in OBS browser source to begin.');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[ButlerBot] Standing down, sir. Good evening.');
  watcher.close();
  wss.close();
  process.exit(0);
});

// Simple HTTP server for manual commentary
const http = require('http');

const httpServer = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/say') {
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
        console.log(`[ButlerBot] ${comment}`);
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
  console.log('[ButlerBot] HTTP control on http://localhost:8766/say (POST)');
});
