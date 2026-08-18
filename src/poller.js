const https = require("https");
const { routeEvent } = require("./router");
const { normalizeEvent } = require("./utils/normalize");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 60000;

function parseTargets(raw, kind) {
  if (!raw) return [];
  return raw.split(";").map((s) => s.trim()).filter(Boolean).map((entry) => {
    const colonIdx = entry.indexOf(":");
    if (colonIdx === -1) return { id: entry, kind, events: null };
    const id = entry.slice(0, colonIdx).trim();
    const events = entry.slice(colonIdx + 1).split(",").map((e) => e.trim()).filter(Boolean);
    return { id, kind, events: events.length ? events : null };
  });
}

function buildTargets() {
  return [
    ...parseTargets(process.env.WATCH_REPOS, "repo"),
    ...parseTargets(process.env.WATCH_ORGS, "org"),
    ...parseTargets(process.env.WATCH_USERS, "user"),
  ];
}

function apiPath(target) {
  if (target.kind === "repo") return `/repos/${target.id}/events`;
  if (target.kind === "org")  return `/orgs/${target.id}/events`;
  return `/users/${target.id}/events/public`;
}

function githubGet(path, etag) {
  return new Promise((resolve) => {
    const headers = {
      "User-Agent": "ghook-poller",
      "Accept": "application/vnd.github+json",
    };
    if (etag) headers["If-None-Match"] = etag;
    if (GITHUB_TOKEN) headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;

    const req = https.request({ hostname: "api.github.com", path, method: "GET", headers }, (res) => {
      if (res.statusCode === 304) {
        res.resume();
        return resolve({ status: 304 });
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, etag: res.headers.etag, headers: res.headers, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers });
        }
      });
    });
    req.on("error", (e) => {
      console.error(`[poller] fetch error for ${path}: ${e.message}`);
      resolve({ status: 0 });
    });
    req.end();
  });
}

async function fetchRepoDetails(fullName) {
  const result = await githubGet(`/repos/${fullName}`, null);
  return result.status === 200 ? result.data : null;
}

function rateLimitPauseMs(headers, now) {
  if (!headers) return 0;
  if (Number(headers["x-ratelimit-remaining"]) !== 0) return 0;
  const reset = Number(headers["x-ratelimit-reset"]);
  if (!Number.isFinite(reset)) return 0;
  return Math.max(0, reset * 1000 - now);
}

async function pollTarget(target, state, repoCache) {
  if (state.pausedUntil && Date.now() < state.pausedUntil) return;

  const result = await githubGet(apiPath(target), state.etag);

  if (result.status === 304 || result.status === 0) return;
  if (result.status !== 200) {
    const pause = rateLimitPauseMs(result.headers, Date.now());
    if (pause > 0) {
      state.pausedUntil = Date.now() + pause;
      const hint = GITHUB_TOKEN
        ? ""
        : " — set GITHUB_TOKEN to raise the limit from 60 to 5000 requests per hour";
      console.warn(
        `[poller] GitHub rate limit reached for ${target.kind}:${target.id}; ` +
        `pausing ${Math.ceil(pause / 1000)}s${hint}`
      );
      return;
    }
    console.warn(`[poller] unexpected status ${result.status} for ${target.kind}:${target.id}`);
    return;
  }

  if (result.etag) state.etag = result.etag;

  const events = Array.isArray(result.data) ? result.data : [];

  // Pre-warm repo cache for any repos we haven't seen yet
  const repoNames = new Set(events.map((e) => e.repo && e.repo.name).filter(Boolean));
  await Promise.all(
    [...repoNames].filter((n) => !repoCache[n]).map(async (n) => {
      const details = await fetchRepoDetails(n);
      if (details) repoCache[n] = details;
    })
  );

  // Process newest-first is default from API; iterate in reverse for chronological order
  for (const apiEvent of [...events].reverse()) {
    if (!apiEvent.id || state.seenIds.has(apiEvent.id)) continue;
    state.seenIds.add(apiEvent.id);

    const normalized = normalizeEvent(apiEvent, repoCache);
    if (!normalized) continue;

    if (target.events && !target.events.includes(normalized.event)) continue;

    routeEvent(normalized.event, normalized.payload);
  }

  // Keep seenIds bounded
  if (state.seenIds.size > 500) {
    const arr = [...state.seenIds];
    state.seenIds = new Set(arr.slice(arr.length - 300));
  }
}

function startPoller() {
  const targets = buildTargets();
  if (targets.length === 0) return;

  console.log(`[poller] watching ${targets.length} target(s) every ${POLL_INTERVAL / 1000}s`);

  const states = new Map(targets.map((t) => [t, { etag: null, seenIds: new Set(), pausedUntil: 0 }]));
  const repoCache = {};

  async function tick() {
    await Promise.all(targets.map((t) => pollTarget(t, states.get(t), repoCache)));
  }

  tick();
  setInterval(tick, POLL_INTERVAL);
}

module.exports = { startPoller, parseTargets, buildTargets, rateLimitPauseMs };
