---
name: ai-gains
description: Manages the AI gains session log. Session initialization and user prompting are handled automatically via hooks. Invoke /ai-gains to manually update the log at any point.
---

# AI Gains Skill

## Context

Session tracking is managed automatically via hooks configured in `.claude/settings.json`:

- **SessionStart hook**: Reads Claude Code's `session_id` from stdin and creates `.ai-gains/<start_time>_<session_id>.json` with `start_time` and `author`. The timestamp uses `-` instead of `:` for cross-platform filename compatibility (e.g. `2026-03-02T09-00-00Z_<session_id>.json`).
- **UserPromptSubmit hook**: Reads the `session_id` from stdin and echoes it into context with a lightweight reminder for Claude to prompt the user to update the log at the end of each response. The skill itself is not loaded automatically — only when the user invokes `/ai-gains`.
- **Stop hook**: Reads the `session_id` from stdin, locates the matching `.ai-gains/*_<session_id>.json` file, and updates `end_time` after every Claude response.

`duration_minutes` is the wall-clock time from `start_time` to `end_time`. This intentionally includes human review time, approval of actions, reading diffs, etc. — giving a true picture of total time spent with AI vs. without.

Files are named `<start_time>_<session_id>.json` so they sort chronologically and concurrent sessions never conflict.

Claude should note the Session ID echoed by each UserPromptSubmit hook and use it to locate the session file.

## Proactive Log Reminders

After completing any meaningful unit of work -- e.g., a feature built, bug fixed, refactor done, research summarized, document drafted, plan or design produced, content written, data analyzed, problem diagnosed -- Claude should remind the user:

> "Meaningful work just completed. Want me to update the AI Gains log? (`/ai-gains`)"

Claude should use judgment about what counts as "meaningful" -- a single quick answer probably doesn't qualify, but anything that would have taken a human more than a few minutes of focused effort does. Claude should not remind the user after every small step within a larger task, only when a task or sub-task reaches a natural stopping point.

## `/ai-gains` Slash Command

When the user invokes `/ai-gains` or confirms they want to update the log:

1. Get the current UTC time:
   ```bash
   node -e "console.log(new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'))"
   ```

2. Use the Session ID echoed by the UserPromptSubmit hook (present in context) to locate the session file:
   ```
   .ai-gains/*_<session_id>.json
   ```

3. Read the session file to get `start_time` and `end_time`.

4. Calculate `duration_minutes` as the difference between `end_time` and `start_time` in minutes (wall-clock time). This includes all time spent in the session — AI working, human reviewing, approving actions, reading output, etc.

5. Reflect on all work done this session: research done, features built, bugs fixed, problems solved, code reviewed, debugging done, documentation updated, etc.

6. For each achievement, estimate how long a human developer would take to do the same work without AI assistance.

7. For each achievement, assign a `category` from this list — pick the one that best describes the primary nature of the work:
   - `bug-fix` — fixing a broken or incorrect behaviour
   - `debugging` — diagnosing, tracing or reproducing a problem (without necessarily fixing it yet)
   - `enhancement` — adding or improving a feature, refactoring, or extending functionality
   - `research` — investigating options, reviewing code/docs, evaluating approaches, visual review
   - `documentation` — writing or updating docs, comments, specs, READMEs
   - `testing` — writing or executing tests, validating functionality
   - `refactoring` — restructuring existing code without changing its external behavior
   - `ui-ux` — designing or improving user interfaces and user experiences
   - `other` — anything that doesn't fit the above

8. Write the updated JSON back to `.ai-gains/<start_utc_timestamp>_<uuid>.json`, preserving existing fields. The JSON structure should look like this:

```json
{
  "uuid": "<session-uuid>",
  "start_time": "<ISO start time>",
  "author": "<git user email>",
  "end_time": "<ISO current time>",
  "duration_minutes": "<number>",
  "achievements": [
    {
      "description": "<what was done>",
      "estimated_human_time_minutes": "<number>",
      "category": "<bug-fix | debugging | enhancement | research | documentation | testing | refactoring | ui-ux | other>"
    }
  ],
  "ai_speedup": "<summary of time saved vs human>"
}
```

8. Confirm to the user that the log has been updated and summarize the key achievements.
