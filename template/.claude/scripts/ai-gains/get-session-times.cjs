'use strict';
const fs = require('fs');
const readline = require('readline');

const transcriptPath = process.argv[2];
const sinceTimestamp = process.argv[3] || null;
if (!transcriptPath) {
  console.error('Usage: get-session-times.cjs <transcript_path> [since_end_time]');
  process.exit(1);
}

const CHUNK_SIZE = 4096;

// Scan from the start for the first entry with a top-level timestamp.
// If sinceTimestamp is given (the end_time of a prior /ai-gains log for this
// same session), skip entries at or before it — this bounds the search to
// only the activity since the last log, so a session transcript resumed
// days or weeks later doesn't count the intervening idle time as duration.
function findFirstTimestamp() {
  const since = sinceTimestamp ? new Date(sinceTimestamp).getTime() : null;
  const rl = readline.createInterface({
    input: fs.createReadStream(transcriptPath),
    crlfDelay: Infinity
  });
  return new Promise(resolve => {
    rl.on('line', line => {
      if (!line.trim()) return;
      try {
        const entry = JSON.parse(line);
        if (entry.timestamp && (since === null || new Date(entry.timestamp).getTime() > since)) {
          resolve(entry.timestamp);
          rl.close();
        }
      } catch {}
    });
    rl.on('close', () => resolve(since !== null ? sinceTimestamp : null));
  });
}

function getEntryText(entry) {
  const content = entry.message?.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter(c => c.type === 'text')
      .map(c => c.text || '')
      .join(' ');
  }
  return '';
}

// A user message that contains the expanded /ai-gains skill content.
// 'estimated_human_time_minutes' is unique to SKILL.md and won't appear
// in normal conversation or the UserPromptSubmit hook injection.
function isAiGainsInvocation(entry) {
  if (entry.type !== 'user' && entry.message?.role !== 'user') return false;
  return getEntryText(entry).includes('estimated_human_time_minutes');
}

function isAssistant(entry) {
  return entry.type === 'assistant' || entry.message?.role === 'assistant';
}

// Scan from the end. Find the last assistant timestamp that precedes the
// most recent /ai-gains skill invocation. Falls back to the last timestamp
// overall if no ai-gains invocation is found (e.g. during a dry-run).
function findEndTimestamp() {
  const fd = fs.openSync(transcriptPath, 'r');
  const { size } = fs.fstatSync(fd);
  let offset = size;
  let remainder = '';
  let phase = 'looking_for_aigains'; // then 'looking_for_assistant'
  let lastTimestamp = null; // fallback
  let result = null;

  outer: while (offset > 0) {
    const readSize = Math.min(CHUNK_SIZE, offset);
    offset -= readSize;
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, offset);
    const chunk = buf.toString('utf8') + remainder;
    const lines = chunk.split('\n');
    remainder = lines.shift(); // incomplete line at chunk boundary

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const entry = JSON.parse(line);

        // Track the absolute last timestamp as a fallback
        if (lastTimestamp === null && entry.timestamp) {
          lastTimestamp = entry.timestamp;
        }

        if (phase === 'looking_for_aigains') {
          if (isAiGainsInvocation(entry)) {
            phase = 'looking_for_assistant';
          }
        } else {
          // phase === 'looking_for_assistant'
          if (isAssistant(entry) && entry.timestamp) {
            result = entry.timestamp;
            break outer;
          }
        }
      } catch {}
    }
  }

  fs.closeSync(fd);
  return result || lastTimestamp;
}

(async () => {
  const start_time = await findFirstTimestamp();
  const end_time = findEndTimestamp();

  if (!start_time || !end_time) {
    console.error('Could not extract timestamps from transcript');
    process.exit(1);
  }

  const duration_minutes = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
  console.log(JSON.stringify({ start_time, end_time, duration_minutes }));
})();
