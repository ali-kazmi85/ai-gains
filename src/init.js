'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE_DIR = path.join(__dirname, '..', 'template');

function mergeSettings(existing, template) {
  const result = JSON.parse(JSON.stringify(existing));
  if (!result.hooks) result.hooks = {};

  for (const [hookType, templateEntries] of Object.entries(template.hooks || {})) {
    if (!result.hooks[hookType]) {
      result.hooks[hookType] = templateEntries;
      continue;
    }

    // Collect all labels already registered for this hook type
    const existingLabels = new Set();
    for (const entry of result.hooks[hookType]) {
      for (const hook of (entry.hooks || [])) {
        if (hook.label) existingLabels.add(hook.label);
      }
    }

    // Append only hooks whose label isn't already present
    for (const templateEntry of templateEntries) {
      const newHooks = (templateEntry.hooks || []).filter(h => !existingLabels.has(h.label));
      if (newHooks.length > 0) {
        result.hooks[hookType].push({ hooks: newHooks });
      }
    }
  }

  return result;
}

function initProject(targetDir) {
  const claudeDir   = path.join(targetDir, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  const skillDst    = path.join(claudeDir, 'skills', 'ai-gains', 'SKILL.md');
  const skillSrc    = path.join(TEMPLATE_DIR, '.claude', 'skills', 'ai-gains', 'SKILL.md');
  const templateSettingsPath = path.join(TEMPLATE_DIR, '.claude', 'settings.json');

  console.log('\n  AI Gains ⚡  Init\n');

  fs.mkdirSync(claudeDir, { recursive: true });

  // Merge settings.json
  const templateSettings = JSON.parse(fs.readFileSync(templateSettingsPath, 'utf8'));
  let existing = {};
  let existed = false;

  if (fs.existsSync(settingsPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      existed = true;
    } catch {
      console.warn('  Warning: existing .claude/settings.json is not valid JSON — overwriting\n');
    }
  }

  const merged = mergeSettings(existing, templateSettings);
  fs.writeFileSync(settingsPath, JSON.stringify(merged, null, 4) + '\n');
  console.log(`  ${existed ? 'merged ' : 'created'} .claude/settings.json`);

  // Copy skill file (own subfolder, safe to overwrite)
  fs.mkdirSync(path.dirname(skillDst), { recursive: true });
  const skillExisted = fs.existsSync(skillDst);
  fs.copyFileSync(skillSrc, skillDst);
  console.log(`  ${skillExisted ? 'updated' : 'created'} .claude/skills/ai-gains/SKILL.md`);

  console.log('\n  Done. Start a Claude Code session in this project to begin tracking.\n');
}

module.exports = { initProject };
