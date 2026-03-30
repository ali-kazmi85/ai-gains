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

# Dashboard from a GitHub repo or user/org
node bin/ai-gains.js github owner/repo
node bin/ai-gains.js github owner

# Use a custom port
PORT=4000 node bin/ai-gains.js
```

No build step — pure JavaScript, no compilation needed.

## Architecture

```
bin/ai-gains.js       CLI entry point — parses args, routes to init / dashboard / github
src/server.js         Express server — local mode (GET /api/sessions) and GitHub mode (GET /api/meta + /api/sessions)
src/github.js         GitHub mode — fetches sessions from remote repos via GitHub API
src/init.js           Init logic — merges hooks into .claude/settings.json, copies skill and scripts
src/dashboard.html    Self-contained SPA (inline CSS + JS, Chart.js via CDN)
template/             Files copied/merged into user's project on `init`
  .claude/settings.json                            Hook definitions (UserPromptSubmit only)
  .claude/skills/ai-gains/SKILL.md                 The /ai-gains skill Claude uses to log achievements
  .claude/scripts/ai-gains/user-prompt-submit.cjs  Hook script: injects session context / reminder into prompt
  .claude/scripts/ai-gains/get-session-times.cjs   Helper: resolves session start/end times from transcripts
```

### Data flow

- **Hooks** write/update `.ai-gains/<session-id>.json` in the user's project directory
- **`/api/sessions`** reads all `.json` files from `.ai-gains/` relative to `process.cwd()`, including nested subdirectories
- **GitHub mode** fetches session files directly from the GitHub API — no clone needed
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

In GitHub mode, sessions also carry a `repo` field (`"owner/repo"`) used by the repo filter and leaderboard.

### Hook merging (`src/init.js`)

`mergeSettings()` deep-merges template hooks into an existing `.claude/settings.json`. Hooks are deduplicated by `label` field — existing hooks are updated in-place and duplicates are never added. Stale ai-gains hooks for hook types no longer used (currently `SessionStart` and `Stop`) are automatically removed during merge.

Scripts and the skill file are always overwritten on `init` so they stay current. The `/ai-gains` skill also triggers `init` automatically, keeping hooks and scripts up to date on every invocation.

## Key implementation notes

- **Port**: Defaults to `3847`; overridden via `PORT` env var
- **No system dependencies**: Hook scripts are pure Node.js (`.cjs`, cross-platform, no `jq` or `date` required)
- **No test framework** is configured — no `npm test` script exists
- **Single production dependency**: `express@^4.18.2`
- **dashboard.html** is a ~1800-line self-contained file (no separate CSS/JS files)
- Sessions are read from `.ai-gains/` relative to `process.cwd()` (the user's project), not this repo's directory; nested `.ai-gains/` directories inside subdirectories are also discovered and aggregated
- GitHub mode uses `GITHUB_TOKEN` env var or `gh auth token` for authentication; unauthenticated requests are rate-limited to 60/hr
