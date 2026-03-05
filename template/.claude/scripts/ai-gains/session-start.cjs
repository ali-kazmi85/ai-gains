'use strict';
const fs = require('fs');
const { execSync } = require('child_process');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  const { session_id } = JSON.parse(raw);
  const start_time = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  let author = 'unknown';
  try {
    author = execSync('git config user.email', { stdio: ['pipe', 'pipe', 'pipe'] })
      .toString().trim();
  } catch {}

  const safeTs = start_time.replace(/:/g, '-');
  fs.mkdirSync('.ai-gains', { recursive: true });
  fs.writeFileSync(
    `.ai-gains/${safeTs}_${session_id}.json`,
    JSON.stringify({ session_id, start_time, author }, null, 2) + '\n'
  );
});
