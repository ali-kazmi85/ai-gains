'use strict';
const fs = require('fs');

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  const { session_id } = JSON.parse(raw);
  const match = fs.readdirSync('.ai-gains').find(f => f.endsWith(`_${session_id}.json`));
  if (!match) return;
  const file = `.ai-gains/${match}`;

  const session = JSON.parse(fs.readFileSync(file, 'utf8'));
  session.end_time = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  fs.writeFileSync(file, JSON.stringify(session, null, 2) + '\n');
});
