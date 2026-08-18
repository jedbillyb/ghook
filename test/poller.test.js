const test = require("node:test");
const assert = require("node:assert/strict");

// --- parseTargets ---

function freshParseTargets(env = {}) {
  for (const key of ["WATCH_REPOS", "WATCH_ORGS", "WATCH_USERS", "POLL_INTERVAL", "GITHUB_TOKEN"]) {
    delete process.env[key];
  }
  Object.assign(process.env, env);
  delete require.cache[require.resolve("../src/poller")];
  return require("../src/poller").parseTargets;
}

test("parseTargets returns empty array for missing input", () => {
  const parseTargets = freshParseTargets();
  assert.deepEqual(parseTargets(undefined, "repo"), []);
  assert.deepEqual(parseTargets("", "repo"), []);
});

test("parseTargets single target no filter", () => {
  const parseTargets = freshParseTargets();
  const result = parseTargets("torvalds/linux", "repo");
  assert.deepEqual(result, [{ id: "torvalds/linux", kind: "repo", events: null }]);
});

test("parseTargets single target with event filter", () => {
  const parseTargets = freshParseTargets();
  const result = parseTargets("torvalds/linux:release,push", "repo");
  assert.deepEqual(result, [{ id: "torvalds/linux", kind: "repo", events: ["release", "push"] }]);
});

test("parseTargets multiple targets semicolon separated", () => {
  const parseTargets = freshParseTargets();
  const result = parseTargets("torvalds/linux:release;vercel/next.js", "repo");
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], { id: "torvalds/linux", kind: "repo", events: ["release"] });
  assert.deepEqual(result[1], { id: "vercel/next.js", kind: "repo", events: null });
});

test("parseTargets trims whitespace", () => {
  const parseTargets = freshParseTargets();
  const result = parseTargets(" torvalds/linux : release , push ", "repo");
  assert.deepEqual(result, [{ id: "torvalds/linux", kind: "repo", events: ["release", "push"] }]);
});

// --- normalizeEvent ---

const { normalizeEvent, TYPE_MAP } = require("../src/utils/normalize");

const baseApiEvent = {
  id: "abc123",
  type: "PushEvent",
  actor: { login: "jedbillyb", avatar_url: "https://avatars.githubusercontent.com/u/1" },
  repo: { name: "jedbillyb/ghook", url: "https://api.github.com/repos/jedbillyb/ghook" },
  payload: { ref: "refs/heads/main", commits: [] },
  created_at: "2026-06-01T00:00:00Z",
};

test("normalizeEvent maps PushEvent to push", () => {
  const result = normalizeEvent(baseApiEvent);
  assert.equal(result.event, "push");
});

test("normalizeEvent constructs repository from repo.name", () => {
  const result = normalizeEvent(baseApiEvent);
  assert.equal(result.payload.repository.full_name, "jedbillyb/ghook");
  assert.equal(result.payload.repository.html_url, "https://github.com/jedbillyb/ghook");
  assert.equal(result.payload.repository.name, "ghook");
  assert.equal(result.payload.repository.private, false);
});

test("normalizeEvent constructs sender from actor", () => {
  const result = normalizeEvent(baseApiEvent);
  assert.equal(result.payload.sender.login, "jedbillyb");
  assert.equal(result.payload.sender.avatar_url, baseApiEvent.actor.avatar_url);
  assert.equal(result.payload.sender.html_url, "https://github.com/jedbillyb");
});

test("normalizeEvent preserves original payload fields", () => {
  const result = normalizeEvent(baseApiEvent);
  assert.equal(result.payload.ref, "refs/heads/main");
  assert.deepEqual(result.payload.commits, []);
});

test("normalizeEvent returns null for unknown event types", () => {
  const unknown = { ...baseApiEvent, type: "UnknownEvent" };
  assert.equal(normalizeEvent(unknown), null);
});

test("normalizeEvent merges cached repo details", () => {
  const cache = {
    "jedbillyb/ghook": { description: "cool", stargazers_count: 42, forks_count: 3, language: "JavaScript" },
  };
  const result = normalizeEvent(baseApiEvent, cache);
  assert.equal(result.payload.repository.description, "cool");
  assert.equal(result.payload.repository.stargazers_count, 42);
  assert.equal(result.payload.repository.language, "JavaScript");
});

test("TYPE_MAP covers all supported event types", () => {
  const expected = ["push", "create", "delete", "watch", "fork", "pull_request", "issues", "issue_comment", "release", "workflow_run"];
  const mapped = Object.values(TYPE_MAP);
  for (const e of expected) assert.ok(mapped.includes(e), `missing: ${e}`);
});

const { rateLimitPauseMs } = require("../src/poller");

const NOW = 1_700_000_000_000;

test("rateLimitPauseMs waits until reset when the quota is exhausted", () => {
  const headers = {
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": String(NOW / 1000 + 120),
  };
  assert.equal(rateLimitPauseMs(headers, NOW), 120_000);
});

test("rateLimitPauseMs does not pause while quota remains", () => {
  const headers = {
    "x-ratelimit-remaining": "17",
    "x-ratelimit-reset": String(NOW / 1000 + 120),
  };
  assert.equal(rateLimitPauseMs(headers, NOW), 0);
});

test("rateLimitPauseMs clamps a reset already in the past", () => {
  const headers = {
    "x-ratelimit-remaining": "0",
    "x-ratelimit-reset": String(NOW / 1000 - 30),
  };
  assert.equal(rateLimitPauseMs(headers, NOW), 0);
});

test("rateLimitPauseMs ignores responses without rate limit headers", () => {
  assert.equal(rateLimitPauseMs(undefined, NOW), 0);
  assert.equal(rateLimitPauseMs({}, NOW), 0);
  assert.equal(rateLimitPauseMs({ "x-ratelimit-remaining": "0" }, NOW), 0);
});
