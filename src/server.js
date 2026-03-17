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

function findAiGainsDirs(rootDir) {
  const results = [];
  const rootAiGains = path.join(rootDir, '.ai-gains');
  if (fs.existsSync(rootAiGains)) results.push(rootAiGains);
  let entries;
  try { entries = fs.readdirSync(rootDir, { withFileTypes: true }); }
  catch { return results; }
  function walk(dir) {
    let ents;
    try { ents = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of ents) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === '.ai-gains') results.push(full);
      else walk(full);
    }
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    walk(path.join(rootDir, entry.name));
  }
  return results;
}

function readSessions(aiGainsDirs) {
  const seen = new Set();
  return aiGainsDirs.flatMap(dir =>
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(file => {
        try {
          return JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        } catch {
          return null;
        }
      })
  )
  .filter(s => s && Array.isArray(s.achievements) && typeof s.duration_minutes === 'number')
  .filter(s => { if (seen.has(s.uuid)) return false; seen.add(s.uuid); return true; });
}

function startServer(rootDir) {
  const aiGainsDirs = findAiGainsDirs(rootDir);
  if (aiGainsDirs.length === 0) {
    console.error(`\n  Error: No .ai-gains directory found under:\n  ${rootDir}\n`);
    console.error('  Run this command from a project directory containing a .ai-gains folder.\n');
    process.exit(1);
  }

  const app = express();

  app.get('/api/sessions', (req, res) => {
    try {
      res.json(readSessions(aiGainsDirs));
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
    if (aiGainsDirs.length === 1) {
      console.log(`  Directory : ${aiGainsDirs[0]}`);
    } else {
      console.log(`  Directories (${aiGainsDirs.length}):`);
      aiGainsDirs.forEach(d => console.log(`    ${d}`));
    }
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

async function startGitHubServer(target, { verbose = false } = {}) {
  const { resolveToken, fetchAllSessions } = require('./github');

  const token = resolveToken();
  if (!token) {
    process.stderr.write('\n  Warning: No GitHub token found. Rate limit: 60 req/hr.\n');
    process.stderr.write('  Set GITHUB_TOKEN or run: gh auth login\n\n');
  }

  process.stdout.write(`\n  Fetching sessions from GitHub: ${target}…\n`);
  let sessions;
  try {
    sessions = await fetchAllSessions(target, token, { verbose });
  } catch (err) {
    console.error(`\n  Error: ${err.message}\n`);
    process.exit(1);
  }

  if (!sessions.length) {
    console.error(`\n  No sessions found for: ${target}\n`);
    process.exit(1);
  }

  const repos = [...new Set(sessions.map(s => s.repo).filter(Boolean))].sort();

  const app = express();

  app.get('/api/meta', (_req, res) => {
    res.json({ mode: 'github', target, repos });
  });

  app.get('/api/sessions', (_req, res) => {
    res.json(sessions);
  });

  app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
  });

  const PORT = parseInt(process.env.PORT || '3847', 10);

  const server = app.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`\n  AI Gains ⚡  [GitHub mode]\n`);
    console.log(`  Dashboard : ${url}`);
    console.log(`  Target    : ${target}`);
    console.log(`  Sessions  : ${sessions.length}`);
    console.log(`  Repos     : ${repos.length}`);
    console.log(`\n  Press Ctrl+C to stop\n`);
    openBrowser(url);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n  Port ${PORT} is already in use.`);
      console.error(`  Try: PORT=4000 npx ai-gains github ${target}\n`);
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

module.exports = { startServer, startGitHubServer };
