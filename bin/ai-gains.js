#!/usr/bin/env node

'use strict';

const path = require('path');
const [,, command] = process.argv;

if (command === 'init') {
  const { initProject } = require('../src/init');
  initProject(process.cwd());
} else if (!command || command === 'dashboard') {
  const { startServer } = require('../src/server');
  startServer(path.join(process.cwd(), '.ai-gains'));
} else {
  console.error(`\n  Unknown command: ${command}`);
  console.error('  Usage:');
  console.error('    npx ai-gains        — start the dashboard');
  console.error('    npx ai-gains init   — set up .claude hooks in this project\n');
  process.exit(1);
}
