---
name: ai-gains
description: Manages the AI gains session log. Session initialization and user prompting are handled automatically via hooks. Invoke /ai-gains to manually update the log at any point.
---

# AI Gains Skill

## Context

Session tracking is managed automatically via a hook configured in `.claude/settings.json`:

- **UserPromptSubmit hook**: Reads `session_id` and `transcript_path` from stdin and echoes both into context, along with a lightweight reminder for Claude to prompt the user to update the log at the end of each response. The skill itself is not loaded automatically — only when the user invokes `/ai-gains`.

`duration_minutes` is derived from the first and last timestamped entries in the session transcript. This reflects actual conversation activity from first message to last response, and intentionally includes human review time, approval of actions, reading diffs, etc. — giving a true picture of total time spent with AI vs. without.

## Proactive Log Reminders

After completing any meaningful unit of work -- e.g., a feature built, bug fixed, refactor done, research summarized, document drafted, plan or design produced, content written, data analyzed, problem diagnosed -- Claude should remind the user:

> "Meaningful work just completed. Want me to update the AI Gains log? (`/ai-gains`)"

Claude should use judgment about what counts as "meaningful" -- a single quick answer probably doesn't qualify, but anything that would have taken a human more than a few minutes of focused effort does. Claude should not remind the user after every small step within a larger task, only when a task or sub-task reaches a natural stopping point.

## `/ai-gains` Slash Command

When the user invokes `/ai-gains` or confirms they want to update the log:

1. Get `session_id` and `transcript_path` from the context echoed by the UserPromptSubmit hook.

2. Run `get-session-times.cjs` with the transcript path to get accurate start/end times and duration:
   ```bash
   node .claude/scripts/ai-gains/get-session-times.cjs <transcript_path>
   ```
   This outputs `{ start_time, end_time, duration_minutes }` derived from the first and last timestamped entries in the transcript.

3. Get the author from git config:
   ```bash
   git config user.email
   ```

4. Check if a session file already exists for this session:
   ```
   .ai-gains/*_<session_id>.json
   ```
   If it exists, read the existing `achievements` array to use as a starting point for merging.

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

8. Merge new achievements with any existing ones from step 4. If a prior achievement is superseded or refined by new work in the same area, update it in place rather than duplicating it.

9. Write the session file to `.ai-gains/<start_time_with_colons_replaced>_<session_id>.json`. The filename uses `-` instead of `:` in the timestamp for cross-platform compatibility. The JSON structure should look like this:

```json
{
  "session_id": "<session-id>",
  "start_time": "<ISO start time>",
  "end_time": "<ISO end time>",
  "author": "<git user email>",
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

10. Confirm to the user that the log has been updated and summarize the key achievements.
