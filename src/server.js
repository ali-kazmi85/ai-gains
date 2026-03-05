'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === 'darwin' ? `open "${url}"` :
    platform === 'win32'  ? `start "" "${url}"` :
                            `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.log(`  Visit ${url} in your browser`);
  });
}

function readSessions(aiGainsDir) {
  return fs.readdirSync(aiGainsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(file => {
      try {
        return JSON.parse(fs.readFileSync(path.join(aiGainsDir, file), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(s => s && Array.isArray(s.achievements) && typeof s.duration_minutes === 'number');
}

function startServer(aiGainsDir) {
  if (!fs.existsSync(aiGainsDir)) {
    console.error(`\n  Error: No .ai-gains directory found in:\n  ${process.cwd()}\n`);
    console.error('  Run this command from a project directory containing a .ai-gains folder.\n');
    process.exit(1);
  }

  const app = express();

  app.get('/api/sessions', (req, res) => {
    try {
      res.json(readSessions(aiGainsDir));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  });

  const PORT = parseInt(process.env.PORT || '3847', 10);

  const server = app.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  AI Gains ⚡\n`);
    console.log(`  Dashboard : ${url}`);
    console.log(`  Directory : ${aiGainsDir}`);
    console.log(`\n  Press Ctrl+C to stop\n`);
    openBrowser(url);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${PORT} is already in use.`);
      console.error(`  Try: PORT=4000 npx ai-gains\n`);
    } else {
      console.error('  Server error:', err.message);
    }
    process.exit(1);
  });

  process.on('SIGINT', () => {
    process.stdout.write('\n');
    if (server.closeAllConnections) server.closeAllConnections();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 500).unref();
  });
}

module.exports = { startServer };
