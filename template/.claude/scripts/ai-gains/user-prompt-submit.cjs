'use strict';

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  const { session_id } = JSON.parse(raw);
  process.stdout.write(
    `Session ID: ${session_id}. IMPORTANT: In your final response, remind the user to update the ai-gains session log (the /ai-gains skill).`
  );
});
