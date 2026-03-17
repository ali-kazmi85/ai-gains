'use strict';

const { execSync } = require('child_process');

function resolveToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const token = execSync('gh auth token', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString().trim();
    if (token) return token;
  } catch {
    // gh CLI not available or not authenticated
  }
  return undefined;
}

async function fetchWithAuth(url, token) {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ai-gains',
  };
  if (token) headers['Authorization'] = `token ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
  return res;
}

async function listRepos(owner, token) {
  const repos = [];

  async function paginate(startUrl) {
    let url = startUrl;
    while (url) {
      const res = await fetchWithAuth(url, token);
      const data = await res.json();
      repos.push(...data.map(r => r.name));
      const link = res.headers.get('Link') || '';
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      url = match ? match[1] : null;
    }
  }

  await paginate(`https://api.github.com/users/${encodeURIComponent(owner)}/repos?per_page=100`);
  // /users endpoint returns 200+empty for orgs — fall back to /orgs endpoint
  if (repos.length === 0) {
    try {
      await paginate(`https://api.github.com/orgs/${encodeURIComponent(owner)}/repos?per_page=100`);
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }

  return repos;
}

async function fetchRepoSessions(owner, repo, token, { verbose = false } = {}) {
  const slug = `${owner}/${repo}`;

  // Recursive git tree — one API call returns all paths in the repo
  let tree;
  try {
    const res = await fetchWithAuth(
      `https://api.github.com/repos/${slug}/git/trees/HEAD?recursive=1`,
      token
    );
    const data = await res.json();
    if (data.truncated) {
      process.stderr.write(`  Warning: ${slug} tree truncated — some sessions may be missing\n`);
    }
    tree = data.tree || [];
  } catch (err) {
    // 404 = repo not found, 409 = empty repo (no commits yet)
    if (err.status === 404 || err.status === 409) {
      if (verbose) process.stderr.write(`  ${slug}  — no .ai-gains/\n`);
      return [];
    }
    throw err;
  }

  // Match .ai-gains/*.json at any depth (root or nested subdirectory)
  const aiGainsFiles = tree.filter(item =>
    item.type === 'blob' &&
    /(?:^|\/).ai-gains\/[^/]+\.json$/.test(item.path)
  );

  if (!aiGainsFiles.length) {
    if (verbose) process.stderr.write(`  ${slug}  — no .ai-gains/\n`);
    return [];
  }

  const sessions = (await Promise.all(aiGainsFiles.map(async item => {
    try {
      const res = await fetchWithAuth(item.url, token);
      const data = await res.json();
      const content = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
      const session = JSON.parse(content);
      if (!Array.isArray(session.achievements) || typeof session.duration_minutes !== 'number') {
        return null;
      }
      session.repo = slug;
      return session;
    } catch {
      return null;
    }
  }))).filter(Boolean);

  if (verbose) {
    const dirs = [...new Set(aiGainsFiles.map(f => f.path.replace(/\/[^/]+$/, '')))];
    const dirNote = dirs.length > 1 ? ` (${dirs.length} dirs)` : '';
    process.stderr.write(`  ${slug}  — ${sessions.length} session${sessions.length !== 1 ? 's' : ''}${dirNote}\n`);
  }
  return sessions;
}

async function fetchAllSessions(target, token, { verbose = false } = {}) {
  let pairs;

  if (target.includes('/')) {
    const slashIdx = target.indexOf('/');
    const owner = target.slice(0, slashIdx);
    const repo  = target.slice(slashIdx + 1);
    pairs = [{ owner, repo }];
  } else {
    const owner = target;
    const repos = await listRepos(owner, token);
    if (verbose) process.stderr.write(`\n  Found ${repos.length} repo${repos.length !== 1 ? 's' : ''} — scanning for .ai-gains/…\n\n`);
    pairs = repos.map(repo => ({ owner, repo }));
  }

  // Fan out in batches of 10 to avoid rate limits
  const BATCH = 10;
  const allSessions = [];
  for (let i = 0; i < pairs.length; i += BATCH) {
    const batch = pairs.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(({ owner, repo }) => fetchRepoSessions(owner, repo, token, { verbose }).catch(() => []))
    );
    allSessions.push(...results.flat());
  }

  // Deduplicate by uuid
  const seen = new Set();
  return allSessions.filter(s => {
    const id = s.uuid || s.session_id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

module.exports = { resolveToken, fetchAllSessions };
