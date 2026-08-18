const test = require("node:test");
const assert = require("node:assert/strict");
const https = require("node:https");

const { buildResolver, parseRoutes, parsePathRoutes, collectPaths, loadWebhooks } = require("../src/routes");

const DEFAULT_URL = "https://discord.example/api/webhooks/0/default";
const RELEASES_URL = "https://discord.example/api/webhooks/1/releases";
const CI_URL = "https://discord.example/api/webhooks/2/ci";

test("parseRoutes returns [] for empty input", () => {
  assert.deepEqual(parseRoutes(""), []);
  assert.deepEqual(parseRoutes(undefined), []);
});

test("parseRoutes parses event:target pairs and trims whitespace", () => {
  assert.deepEqual(
    parseRoutes(" release:RELEASES , workflow_run : CI "),
    [
      { event: "release", target: "RELEASES" },
      { event: "workflow_run", target: "CI" },
    ]
  );
});

test("parseRoutes drops malformed entries", () => {
  assert.deepEqual(parseRoutes("release,workflow_run:,:CI,issues:ISSUES"), [
    { event: "issues", target: "ISSUES" },
  ]);
});

test("loadWebhooks picks up DISCORD_WEBHOOK_* env vars", () => {
  const webhooks = loadWebhooks({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    DISCORD_WEBHOOK_CI: "",
    UNRELATED_VAR: "ignored",
  });
  assert.equal(webhooks.get("URL"), DEFAULT_URL);
  assert.equal(webhooks.get("RELEASES"), RELEASES_URL);
  assert.equal(webhooks.has("CI"), false, "empty webhook values are ignored");
  assert.equal(webhooks.has("UNRELATED_VAR"), false);
});

test("resolve returns default URL when ROUTES is unset", () => {
  const { resolve } = buildResolver({ DISCORD_WEBHOOK_URL: DEFAULT_URL });
  assert.equal(resolve("release"), DEFAULT_URL);
  assert.equal(resolve("push"), DEFAULT_URL);
  assert.equal(resolve(undefined), DEFAULT_URL);
});

test("resolve picks the first matching rule and falls back to default", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    DISCORD_WEBHOOK_CI: CI_URL,
    ROUTES: "release:RELEASES,workflow_run:CI",
  });
  assert.equal(resolve("release"), RELEASES_URL);
  assert.equal(resolve("workflow_run"), CI_URL);
  assert.equal(resolve("push"), DEFAULT_URL);
});

test("resolve enforces first-match-wins ordering", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    DISCORD_WEBHOOK_CI: CI_URL,
    ROUTES: "release:RELEASES,release:CI",
  });
  assert.equal(resolve("release"), RELEASES_URL);
});

test("resolve falls back to default when the rule targets an unknown webhook", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    ROUTES: "release:DOES_NOT_EXIST",
  });
  assert.equal(resolve("release"), DEFAULT_URL);
});

test("resolve returns an empty string when no default and no match", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    ROUTES: "release:RELEASES",
  });
  assert.equal(resolve("push"), "");
});

function freshSend(env = {}) {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("DISCORD_WEBHOOK_") || key === "ROUTES" || key === "DISCORD_LEGACY_EMBEDS") {
      delete process.env[key];
    }
  }
  Object.assign(process.env, env);
  delete require.cache[require.resolve("../src/discord")];
  delete require.cache[require.resolve("../src/routes")];
  delete require.cache[require.resolve("../src/components")];
  return require("../src/discord");
}

function captureRequest(t) {
  const calls = [];
  const original = https.request;
  https.request = (opts) => {
    const call = { opts, body: "" };
    calls.push(call);
    return { on() {}, write(d) { call.body += d; }, end() {} };
  };
  t.after(() => { https.request = original; });
  return calls;
}

test("send falls back to DISCORD_WEBHOOK_URL when event has no route", (t) => {
  const calls = captureRequest(t);
  const { send } = freshSend({ DISCORD_WEBHOOK_URL: DEFAULT_URL });
  send({ title: "x" }, "push");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opts.hostname, "discord.example");
  assert.match(calls[0].opts.path, /\/api\/webhooks\/0\/default/);
});

test("send dispatches to the routed webhook when a rule matches", (t) => {
  const calls = captureRequest(t);
  const { send } = freshSend({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    ROUTES: "release:RELEASES",
  });
  send({ title: "x" }, "release");
  send({ title: "x" }, "push");

  assert.equal(calls.length, 2);
  assert.match(calls[0].opts.path, /\/api\/webhooks\/1\/releases/);
  assert.match(calls[1].opts.path, /\/api\/webhooks\/0\/default/);
});

test("send resolves to the default webhook when no event is passed", (t) => {
  const calls = captureRequest(t);
  const { send } = freshSend({ DISCORD_WEBHOOK_URL: DEFAULT_URL });
  send({ title: "x" });
  assert.equal(calls.length, 1);
  assert.match(calls[0].opts.path, /\/api\/webhooks\/0\/default/);
});

test("send is a no-op when no URL can be resolved", (t) => {
  const calls = captureRequest(t);
  const { send } = freshSend({});
  send({ title: "x" }, "push");
  assert.equal(calls.length, 0);
});

test("interleaved async sends resolve to the right webhook for each event", async (t) => {
  const calls = captureRequest(t);
  const { send } = freshSend({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_RELEASES: RELEASES_URL,
    DISCORD_WEBHOOK_CI: CI_URL,
    ROUTES: "release:RELEASES,workflow_run:CI",
  });

  await Promise.all([
    new Promise((r) => setTimeout(() => { send({ title: "RELEASE_MARKER" }, "release"); r(); }, 20)),
    new Promise((r) => setTimeout(() => { send({ title: "WORKFLOW_MARKER" }, "workflow_run"); r(); }, 10)),
  ]);

  assert.equal(calls.length, 2);
  const workflowCall = calls.find((c) => c.body.includes("WORKFLOW_MARKER"));
  const releaseCall = calls.find((c) => c.body.includes("RELEASE_MARKER"));
  assert.ok(workflowCall, "expected a call carrying the workflow payload");
  assert.ok(releaseCall, "expected a call carrying the release payload");
  assert.match(workflowCall.opts.path, /\/api\/webhooks\/2\/ci/);
  assert.match(releaseCall.opts.path, /\/api\/webhooks\/1\/releases/);
});

const API_URL = "https://discord.example/api/webhooks/3/api";
const WEB_URL = "https://discord.example/api/webhooks/4/web";

function pushPayload(...files) {
  return { commits: [{ added: [], modified: files, removed: [] }] };
}

test("parsePathRoutes parses pattern:target pairs and trims whitespace", () => {
  assert.deepEqual(
    parsePathRoutes(" packages/api/** : API , packages/web/** : WEB "),
    [
      { pattern: "packages/api/**", target: "API" },
      { pattern: "packages/web/**", target: "WEB" },
    ]
  );
});

test("parsePathRoutes drops malformed entries", () => {
  assert.deepEqual(parsePathRoutes("packages/api/**,web/**:,:API,docs/**:DOCS"), [
    { pattern: "docs/**", target: "DOCS" },
  ]);
});

test("collectPaths gathers added, modified and removed across commits", () => {
  const payload = {
    commits: [
      { added: ["a.js"], modified: ["b.js"], removed: ["c.js"] },
      { modified: ["d.js"] },
    ],
  };
  assert.deepEqual(collectPaths(payload), ["a.js", "b.js", "c.js", "d.js"]);
});

test("collectPaths returns [] when the payload carries no commits", () => {
  assert.deepEqual(collectPaths(undefined), []);
  assert.deepEqual(collectPaths({}), []);
  assert.deepEqual(collectPaths({ commits: [] }), []);
});

test("resolve routes a push by the path of a changed file", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    DISCORD_WEBHOOK_WEB: WEB_URL,
    PATH_ROUTES: "packages/api/**:API,packages/web/**:WEB",
  });
  assert.equal(resolve("push", pushPayload("packages/web/src/index.ts")), WEB_URL);
  assert.equal(resolve("push", pushPayload("packages/api/src/server.ts")), API_URL);
});

test("resolve enforces first-match-wins across path rules", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    DISCORD_WEBHOOK_WEB: WEB_URL,
    PATH_ROUTES: "packages/api/**:API,packages/web/**:WEB",
  });
  const payload = pushPayload("packages/web/a.ts", "packages/api/b.ts");
  assert.equal(resolve("push", payload), API_URL);
});

test("resolve falls back to default when no path rule matches", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    PATH_ROUTES: "packages/api/**:API",
  });
  assert.equal(resolve("push", pushPayload("docs/readme.md")), DEFAULT_URL);
});

test("PATH_ROUTES takes precedence over ROUTES for the same event", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    DISCORD_WEBHOOK_CI: CI_URL,
    ROUTES: "push:CI",
    PATH_ROUTES: "packages/api/**:API",
  });
  assert.equal(resolve("push", pushPayload("packages/api/a.ts")), API_URL);
  assert.equal(resolve("push", pushPayload("docs/readme.md")), CI_URL);
});

test("resolve ignores path rules when the event carries no commits", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    PATH_ROUTES: "packages/api/**:API",
  });
  assert.equal(resolve("issues"), DEFAULT_URL);
});

test("single star matches one path segment, double star matches across segments", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    PATH_ROUTES: "src/*/index.ts:API",
  });
  assert.equal(resolve("push", pushPayload("src/api/index.ts")), API_URL);
  assert.equal(resolve("push", pushPayload("src/api/deep/index.ts")), DEFAULT_URL);
});

test("resolve falls back to default when a path rule targets an unknown webhook", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    PATH_ROUTES: "packages/api/**:MISSING",
  });
  assert.equal(resolve("push", pushPayload("packages/api/a.ts")), DEFAULT_URL);
});

test("path rules apply to push only, not to other events carrying commits", () => {
  const { resolve } = buildResolver({
    DISCORD_WEBHOOK_URL: DEFAULT_URL,
    DISCORD_WEBHOOK_API: API_URL,
    PATH_ROUTES: "packages/api/**:API",
  });
  const payload = pushPayload("packages/api/a.ts");
  assert.equal(resolve("push", payload), API_URL);
  assert.equal(resolve("workflow_run", payload), DEFAULT_URL);
});

test("PATH_ROUTES warns at startup when a polled target is configured", () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    buildResolver({
      DISCORD_WEBHOOK_URL: DEFAULT_URL,
      DISCORD_WEBHOOK_API: API_URL,
      PATH_ROUTES: "packages/api/**:API",
      WATCH_REPOS: "torvalds/linux",
    });
  } finally {
    console.warn = original;
  }
  assert.ok(
    warnings.some((w) => w.includes("PATH_ROUTES has no effect on polled targets")),
    "expected a startup warning about polled targets"
  );
});

test("PATH_ROUTES stays quiet when no polled target is configured", () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (msg) => warnings.push(String(msg));
  try {
    buildResolver({
      DISCORD_WEBHOOK_URL: DEFAULT_URL,
      DISCORD_WEBHOOK_API: API_URL,
      PATH_ROUTES: "packages/api/**:API",
    });
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 0);
});
