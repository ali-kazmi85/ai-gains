# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

**AI Gains** is an npm-published CLI tool (`ai-gains`) that tracks time saved using Claude Code. It logs sessions via Claude Code hooks, lets users log achievements via a `/ai-gains` skill, and visualises productivity data in a browser dashboard.

## Running the project

```bash
# Start the dashboard (opens browser at http://localhost:3847)
node bin/ai-gains.js

# Initialize a target project with hooks and skill
node bin/ai-gains.js init

# Use a custom port
PORT=4000 node bin/ai-gains.js
```

No build step — pure JavaScript, no compilation needed.

## Architecture

```
bin/ai-gains.js       CLI entry point — parses args, routes to init or dashboard
src/server.js         Express server — serves dashboard.html, exposes GET /api/sessions
src/init.js           Init logic — merges hooks into .claude/settings.json, copies skill and scripts
src/dashboard.html    Self-contained SPA (inline CSS + JS, Chart.js via CDN)
template/             Files copied/merged into user's project on `init`
  .claude/settings.json                        Hook definitions (SessionStart, UserPromptSubmit, Stop)
  .claude/skills/ai-gains/SKILL.md             The /ai-gains skill Claude uses to log achievements
  .claude/scripts/ai-gains/session-start.js    Hook script: creates session file
  .claude/scripts/ai-gains/user-prompt-submit.js  Hook script: injects reminder into prompt
  .claude/scripts/ai-gains/stop.js             Hook script: writes end_time to session file
```

### Data flow

- **Hooks** write/update `.ai-gains/<session-id>.json` in the user's project directory
- **`/api/sessions`** reads all `.json` files from `.ai-gains/` relative to `process.cwd()`
- **Dashboard SPA** fetches sessions once on load, filters/renders client-side

### Session JSON schema

```json
{
  "uuid": "...",
  "session_id": "...",
  "start_time": "ISO8601",
  "end_time": "ISO8601",
  "author": "user@example.com",
  "duration_minutes": 45,
  "output": {
    "files_changed": 4,
    "lines_added": 120,
    "lines_removed": 35,
    "commits": 2
  },
  "achievements": [
    {
      "description": "...",
      "estimated_human_time_minutes": 180,
      "category": "enhancement",
      "files_created": [],
      "files_modified": []
    }
  ],
  "ai_speedup": "4× faster — 3h of work done in 45 minutes"
}
```

The `output` field is optional (omitted when git is unavailable or repo has no history). All schema changes are additive — existing sessions without `output` render correctly in the dashboard.

### Hook merging (`src/init.js`)

`mergeSettings()` deep-merges template hooks into an existing `.claude/settings.json`. Hooks are deduplicated by `label` field — existing hooks are preserved and duplicates are never added.

## Key implementation notes

- **Port**: Defaults to `3847`; overridden via `PORT` env var
- **No system dependencies**: Hooks are pure Node.js scripts (cross-platform, no `jq` or `date` required)
- **No test framework** is configured — no `npm test` script exists
- **Single production dependency**: `express@^4.18.2`
- **dashboard.html** is a 830-line self-contained file (no separate CSS/JS files)
- Sessions are read from `.ai-gains/` relative to `process.cwd()` (the user's project), not this repo's directory
