'use strict';
const fs = require('fs');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  const { session_id } = JSON.parse(raw);
  const file = `.ai-gains/${session_id}.json`;
  if (!fs.existsSync(file)) return;

  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  session.end_time = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  fs.writeFileSync(file, JSON.stringify(session, null, 2) + '\n');
});
