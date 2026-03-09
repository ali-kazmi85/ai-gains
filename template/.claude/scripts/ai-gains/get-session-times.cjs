'use strict';
const fs = require('fs');

const transcriptPath = process.argv[2];
if (!transcriptPath) {
  console.error('Usage: get-session-times.cjs <transcript_path>');
  process.exit(1);
}

const CHUNK_SIZE = 4096;
const fd = fs.openSync(transcriptPath, 'r');
const { size } = fs.fstatSync(fd);

// Scan from the start for the first entry with a timestamp
function findFirstTimestamp() {
  const rl = require('readline').createInterface({
    input: fs.createReadStream(transcriptPath),
    crlfDelay: Infinity
  });
  return new Promise(resolve => {
    rl.on('line', line => {
      if (!line.trim()) return;
      try {
        const entry = JSON.parse(line);
        if (entry.timestamp) {
          rl.close();
          resolve(entry.timestamp);
        }
      } catch {}
    });
    rl.on('close', () => resolve(null));
  });
}

// Scan from the end for the last entry with a timestamp
function findLastTimestamp() {
  let offset = size;
  let remainder = '';
  let lastTimestamp = null;

  while (offset > 0) {
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
        if (entry.timestamp) {
          lastTimestamp = entry.timestamp;
          break;
        }
      } catch {}
    }
    if (lastTimestamp) break;
  }

  fs.closeSync(fd);
  return lastTimestamp;
}

(async () => {
  const [start_time, end_time] = await Promise.all([
    findFirstTimestamp(),
    Promise.resolve(findLastTimestamp())
  ]);

  if (!start_time || !end_time) {
    console.error('Could not extract timestamps from transcript');
    process.exit(1);
  }

  const duration_minutes = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
  console.log(JSON.stringify({ start_time, end_time, duration_minutes }));
})();
