# AI Gains ⚡

Track the time you save using AI in your development workflow. AI Gains automatically logs Claude Code sessions and visualises your productivity gains in a browser dashboard.

## How it works

1. **Hooks** record each Claude Code session — start time, author, end time
2. **A skill** prompts Claude to log achievements and estimate how long the work would have taken without AI
3. **A dashboard** visualises sessions, time saved, and speedup across your project

## Setup

In your project directory:

```bash
npx ai-gains init
```

This sets up `.claude/settings.json` hooks and the `/ai-gains` skill. If you already have a `settings.json`, the hooks are merged in safely — existing hooks are preserved and duplicates are never added.

## Running the dashboard

```bash
npx ai-gains
```

Opens a browser dashboard at `http://localhost:3847` showing sessions from the current project's `.ai-gains` folder.

To use a different port:

```bash
PORT=4000 npx ai-gains
```

## Logging a session

At the end of a Claude Code session, run:

```
/ai-gains
```

Claude will reflect on the work done, estimate how long it would have taken a human, and write the session log to `.ai-gains/`.

You can also run `/ai-gains` mid-session to log a checkpoint.

## Dashboard features

- **Stats** — total sessions, achievements, time saved, average speedup
- **Chart** — AI time vs estimated human time per session
- **Filters** — filter by author and time period
- **Session detail** — per-session breakdown of achievements and files touched

## What gets tracked

Each session file (`.ai-gains/<session-id>.json`) contains:

```json
{
  "uuid": "...",
  "start_time": "2026-01-15T09:00:00Z",
  "end_time": "2026-01-15T09:45:00Z",
  "author": "you@example.com",
  "duration_minutes": 45,
  "achievements": [
    {
      "description": "Implemented user authentication with JWT",
      "estimated_human_time_minutes": 180
    }
  ],
  "ai_speedup": "4× faster — 3h of work done in 45 minutes"
}
```

## Committing session logs

Add `.ai-gains/` to your repository to share gains across your team. Each file is named by session ID so concurrent sessions never conflict.

## Requirements

- Node.js 16+
- [Claude Code](https://claude.ai/code)
