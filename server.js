/**
 * PAL-E Dashboard
 * Web UI that connects to the Observer service and displays events.
 */

const WebSocket = require('ws');
const http = require('http');

// Configuration
const CONFIG = {
  httpPort: 8766,
  observerWsUrl: process.env.OBSERVER_URL || 'ws://localhost:8765',
  reconnectDelayMs: 3000,
};

// State (received from observer)
let worldState = {
  worldId: null,
  hostPlayer: null,
  players: [],
  palCount: 0,
  baseCount: 0,
  lastParsed: null,
};
let observerConnected = false;
let recentEvents = [];

// Dashboard HTML template
const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PAL-E Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #1a1a2e;
      color: #eee;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 800px; margin: 0 auto; }
    header {
      background: linear-gradient(135deg, #16213e, #1a1a2e);
      border: 1px solid #0f3460;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 1.5rem;
      color: #e94560;
      margin-bottom: 10px;
    }
    .world-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .info-item { color: #94a3b8; font-size: 0.9rem; }
    .info-value { color: #fff; font-weight: 600; }
    .host-badge {
      display: inline-block;
      background: #e94560;
      color: #fff;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-left: 8px;
    }
    .panels {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }
    .panel {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 12px;
      padding: 16px;
    }
    .panel h2 {
      font-size: 0.85rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .player-list { list-style: none; }
    .player-list li {
      padding: 8px 0;
      border-bottom: 1px solid #0f3460;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .player-list li:last-child { border-bottom: none; }
    .player-name { font-weight: 500; }
    .player-level { color: #94a3b8; font-size: 0.85rem; }
    .stat-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .stat {
      background: #1a1a2e;
      padding: 12px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #e94560;
    }
    .stat-label {
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .activity-feed {
      background: #16213e;
      border: 1px solid #0f3460;
      border-radius: 12px;
      padding: 16px;
    }
    .activity-feed h2 {
      font-size: 0.85rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 12px;
    }
    .feed-list { list-style: none; max-height: 300px; overflow-y: auto; }
    .feed-item {
      padding: 8px 0;
      border-bottom: 1px solid #0f3460;
      font-size: 0.9rem;
    }
    .feed-item:last-child { border-bottom: none; }
    .feed-time {
      color: #64748b;
      font-size: 0.75rem;
      margin-right: 8px;
    }
    .feed-type {
      color: #e94560;
      font-size: 0.7rem;
      text-transform: uppercase;
      margin-right: 6px;
    }
    .status-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
    }
    .status-connected { background: #22c55e; }
    .status-disconnected { background: #ef4444; }
    .status-connecting { background: #f59e0b; }
    .connection-status {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 10px;
    }
    .no-data { color: #64748b; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>PAL-E Dashboard</h1>
      <div class="world-info">
        <div>
          <span class="info-item">World ID:</span>
          <span class="info-value" id="worldId">Loading...</span>
        </div>
        <div>
          <span class="info-item">Host:</span>
          <span class="info-value" id="hostPlayer">Loading...</span>
        </div>
        <div>
          <span class="info-item">Last Save:</span>
          <span class="info-value" id="lastSave">-</span>
        </div>
        <div>
          <span class="info-item">Bases:</span>
          <span class="info-value" id="baseCount">-</span>
        </div>
      </div>
      <div class="connection-status">
        <span class="status-dot status-disconnected" id="statusDot"></span>
        <span id="connectionText">Connecting...</span>
      </div>
    </header>

    <div class="panels">
      <div class="panel">
        <h2>Players</h2>
        <ul class="player-list" id="playerList">
          <li class="no-data">No data yet</li>
        </ul>
      </div>
      <div class="panel">
        <h2>Stats</h2>
        <div class="stat-grid">
          <div class="stat">
            <div class="stat-value" id="palCount">-</div>
            <div class="stat-label">Pals</div>
          </div>
          <div class="stat">
            <div class="stat-value" id="playerCount">-</div>
            <div class="stat-label">Players</div>
          </div>
        </div>
      </div>
    </div>

    <div class="activity-feed">
      <h2>Recent Activity</h2>
      <ul class="feed-list" id="feedList">
        <li class="no-data">Waiting for events...</li>
      </ul>
    </div>
  </div>

  <script>
    let ws = null;
    const feedItems = [];
    const MAX_FEED_ITEMS = 20;

    function formatTime(isoString) {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return d.toLocaleTimeString();
    }

    function timeAgo(isoString) {
      if (!isoString) return '-';
      const seconds = Math.floor((Date.now() - new Date(isoString)) / 1000);
      if (seconds < 60) return seconds + 's ago';
      if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
      return Math.floor(seconds / 3600) + 'h ago';
    }

    function updateUI(data) {
      if (data.worldState) {
        const ws = data.worldState;
        document.getElementById('worldId').textContent = ws.worldId || 'Unknown';
        document.getElementById('hostPlayer').textContent = ws.hostPlayer || 'Unknown';
        document.getElementById('palCount').textContent = ws.palCount || 0;
        document.getElementById('baseCount').textContent = ws.baseCount || 0;
        document.getElementById('lastSave').textContent = timeAgo(ws.lastParsed);

        // Update player list with levels
        const playerList = document.getElementById('playerList');
        if (ws.players && ws.players.length > 0) {
          playerList.innerHTML = ws.players.map(p => {
            const name = typeof p === 'string' ? p : p.name;
            const level = typeof p === 'object' && p.level ? ' Lv.' + p.level : '';
            const host = typeof p === 'object' && p.is_host ? '<span class="host-badge">HOST</span>' : '';
            return '<li><span class="player-name">' + name + host + '</span><span class="player-level">' + level + '</span></li>';
          }).join('');
          document.getElementById('playerCount').textContent = ws.players.length;
        }
      }
    }

    function addFeedItem(text, eventType) {
      feedItems.unshift({ time: new Date().toISOString(), text, eventType });
      if (feedItems.length > MAX_FEED_ITEMS) feedItems.pop();

      const feedList = document.getElementById('feedList');
      feedList.innerHTML = feedItems.map(item => {
        const typeSpan = item.eventType ? '<span class="feed-type">' + item.eventType + '</span>' : '';
        return '<li class="feed-item"><span class="feed-time">' + formatTime(item.time) + '</span>' + typeSpan + item.text + '</li>';
      }).join('');
    }

    function connect() {
      document.getElementById('statusDot').className = 'status-dot status-connecting';
      document.getElementById('connectionText').textContent = 'Connecting to Observer...';

      ws = new WebSocket('ws://' + window.location.hostname + ':8766');

      ws.onopen = () => {
        document.getElementById('statusDot').className = 'status-dot status-connected';
        document.getElementById('connectionText').textContent = 'Connected to PAL-E Observer';
      };

      ws.onclose = () => {
        document.getElementById('statusDot').className = 'status-dot status-disconnected';
        document.getElementById('connectionText').textContent = 'Disconnected - reconnecting...';
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        document.getElementById('connectionText').textContent = 'Connection error';
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === 'greeting') {
          addFeedItem(data.message || 'Connected', 'system');
          if (data.worldState) updateUI({ worldState: data.worldState });
          // Load recent events
          if (data.recentEvents) {
            data.recentEvents.reverse().forEach(e => {
              addFeedItem(e.message, e.eventType || e.type);
            });
          }
        } else if (data.type === 'game_event') {
          addFeedItem(data.message, data.eventType);
          if (data.worldState) updateUI({ worldState: data.worldState });
        } else if (data.type === 'file_changed') {
          addFeedItem(data.message, data.fileType || 'file');
        } else if (data.type === 'observer_status') {
          if (!data.connected) {
            document.getElementById('connectionText').textContent = 'Observer disconnected';
          }
        }
      };
    }

    // Refresh time-ago every 30s
    setInterval(() => {
      fetch('/status').then(r => r.json()).then(data => {
        if (data.worldState?.lastParsed) {
          document.getElementById('lastSave').textContent = timeAgo(data.worldState.lastParsed);
        }
      }).catch(() => {});
    }, 30000);

    connect();
  </script>
</body>
</html>`;

// HTTP server for dashboard
const httpServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'GET' && (req.url === '/' || req.url === '/dashboard')) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(dashboardHTML);

  } else if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      worldState,
      observerConnected,
      uptime: process.uptime(),
    }, null, 2));

  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// WebSocket server for browsers (relays from observer)
const browserWss = new WebSocket.Server({ server: httpServer });

browserWss.on('connection', (ws) => {
  console.log('[Dashboard] Browser client connected');

  // Send current state
  ws.send(JSON.stringify({
    type: 'greeting',
    message: observerConnected ? 'PAL-E Dashboard connected' : 'Waiting for Observer...',
    timestamp: new Date().toISOString(),
    worldState,
    recentEvents: recentEvents.slice(0, 10),
  }));

  ws.on('close', () => {
    console.log('[Dashboard] Browser client disconnected');
  });
});

// Broadcast to all browser clients
function broadcastToBrowsers(data) {
  const message = JSON.stringify(data);
  browserWss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Connect to Observer service
let observerWs = null;

function connectToObserver() {
  console.log(`[Dashboard] Connecting to observer: ${CONFIG.observerWsUrl}`);

  observerWs = new WebSocket(CONFIG.observerWsUrl);

  observerWs.on('open', () => {
    console.log('[Dashboard] Connected to Observer');
    observerConnected = true;
    broadcastToBrowsers({
      type: 'observer_status',
      connected: true,
      timestamp: new Date().toISOString(),
    });
  });

  observerWs.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());

      // Update world state from observer
      if (event.worldState) {
        worldState = event.worldState;
      }

      // Track recent events
      if (event.type === 'game_event' || event.type === 'file_changed') {
        recentEvents.unshift(event);
        if (recentEvents.length > 50) {
          recentEvents = recentEvents.slice(0, 50);
        }
      }

      // Relay to browsers
      broadcastToBrowsers(event);

      // Log interesting events
      if (event.type === 'game_event') {
        console.log(`[Dashboard] ${event.message}`);
      }

    } catch (e) {
      console.error('[Dashboard] Failed to parse observer message:', e.message);
    }
  });

  observerWs.on('close', () => {
    console.log('[Dashboard] Observer connection closed');
    observerConnected = false;
    broadcastToBrowsers({
      type: 'observer_status',
      connected: false,
      timestamp: new Date().toISOString(),
    });
    // Reconnect
    setTimeout(connectToObserver, CONFIG.reconnectDelayMs);
  });

  observerWs.on('error', (err) => {
    console.error('[Dashboard] Observer connection error:', err.message);
  });
}

// Start server
httpServer.listen(CONFIG.httpPort, () => {
  console.log(`[Dashboard] HTTP server: http://localhost:${CONFIG.httpPort}`);
  console.log('[Dashboard] Open in browser to view dashboard');
  connectToObserver();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Dashboard] Shutting down...');
  if (observerWs) observerWs.close();
  browserWss.close();
  httpServer.close();
  process.exit(0);
});

console.log('[Dashboard] PAL-E Dashboard started');
