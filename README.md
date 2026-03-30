# AI Gains ⚡

Track the time you save using AI in your development workflow. AI Gains automatically logs Claude Code sessions and visualises your productivity gains in a browser dashboard.

## How it works

1. **Hooks** record each Claude Code session — start time, author, end time
2. **A skill** reminds you to log achievements at natural stopping points; run `/ai-gains` whenever you want to capture what was done and estimate how long it would have taken without AI
3. **A dashboard** visualises sessions, time saved, and speedup across your project

## Setup

In your project directory:

```bash
npx ai-gains init
```

This sets up `.claude/settings.json` hooks and the `/ai-gains` skill. If you already have a `settings.json`, the hooks are merged in safely — existing hooks are preserved and duplicates are never added.

The hooks and scripts are also kept up to date automatically: each time you run `/ai-gains`, the skill checks for newer versions and updates them in place.

## Running the dashboard

```bash
npx ai-gains
```

Opens a browser dashboard at `http://localhost:3847` showing sessions from the current project's `.ai-gains` folder (and any nested `.ai-gains` directories within subdirectories).

To use a different port:

```bash
PORT=4000 npx ai-gains
```

## GitHub mode

View sessions from any public (or private, with a token) GitHub repository without cloning it:

```bash
# Single repo
npx ai-gains github owner/repo

# All repos for a user or organisation
npx ai-gains github owner
```

A `GITHUB_TOKEN` environment variable or `gh auth login` session is used automatically if available. Without a token the GitHub API rate limit is 60 requests/hour.

## Logging achievements

After completing a meaningful piece of work — a feature, a bug fix, a refactor — run:

```
/ai-gains
```

Claude will reflect on what was done, capture git output signals (lines added/removed, commits), estimate how long the work would have taken a competent mid-level developer without AI, and write the achievement to the session log. Estimates deliberately err conservative — credible numbers matter more than impressive ones.

Run it as many times as you like within a session to capture checkpoints, or once at the end to log everything in one go. The hooks handle start and end time automatically — `/ai-gains` is purely for recording what was accomplished.

## Dashboard features

- **Stats** — total time saved (hero metric), sessions, achievements, weighted average speedup
- **Chart** — time saved per session as a bar chart, with a 5-session rolling average line showing whether AI is becoming more or less useful over time. Sessions with suspiciously high speedup estimates (>15×) are highlighted amber.
- **Leaderboard** — author and repo leaderboards ranking contributors by time saved, with proportional bars
- **Sessions screen** — full per-session breakdown of achievements, categories, and files touched
- **Filters** — filter by author, repo, and time period
- **Light / dark mode** — toggle in the header; preference is saved across visits

## What gets tracked

Each session file (`.ai-gains/<session-id>.json`) contains:

```json
{
  "uuid": "...",
  "start_time": "2026-01-15T09:00:00Z",
  "end_time": "2026-01-15T09:45:00Z",
  "author": "you@example.com",
  "duration_minutes": 45,
  "output": {
    "files_changed": 4,
    "lines_added": 120,
    "lines_removed": 35,
    "commits": 2
  },
  "achievements": [
    {
      "description": "Implemented user authentication with JWT",
      "estimated_human_time_minutes": 180,
      "category": "enhancement"
    }
  ],
  "ai_speedup": "4× faster — 3h of work done in 45 minutes"
}
```

The `output` field is auto-captured from git and provides an objective cross-check on estimates. It is omitted if git is unavailable.

## Committing session logs

Add `.ai-gains/` to your repository to share gains across your team. Each file is named `<timestamp>_<session-id>.json` so files sort chronologically and concurrent sessions never conflict.

## Requirements

- Node.js 18+
- [Claude Code](https://claude.ai/code)
