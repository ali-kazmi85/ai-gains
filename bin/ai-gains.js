#!/usr/bin/env node

'use strict';

const path = require('path');
const [,, command] = process.argv;

if (command === 'init') {
  const { initProject } = require('../src/init');
  initProject(process.cwd());
} else if (!command || command === 'dashboard') {
  const { startServer } = require('../src/server');
  startServer(process.cwd());
} else if (command === 'github') {
  const target = process.argv[3];
  if (!target) {
    console.error('\n  Usage:');
    console.error('    npx ai-gains github <owner/repo>  — single repo dashboard');
    console.error('    npx ai-gains github <owner>       — all repos of a user/org\n');
    process.exit(1);
  }
  const verbose = process.argv.slice(4).includes('--verbose') || process.argv.slice(4).includes('-v');
  const { startGitHubServer } = require('../src/server');
  startGitHubServer(target, { verbose });
} else {
  console.error(`\n  Unknown command: ${command}`);
  console.error('  Usage:');
  console.error('    npx ai-gains                      — start the dashboard');
  console.error('    npx ai-gains init                 — set up .claude hooks in this project');
  console.error('    npx ai-gains github <owner/repo>  — dashboard from a GitHub repo');
  console.error('    npx ai-gains github <owner>       — dashboard from all repos of a user/org\n');
  process.exit(1);
}
