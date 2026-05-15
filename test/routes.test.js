const test = require("node:test");
const assert = require("node:assert/strict");
const https = require("node:https");

const { buildResolver, parseRoutes, loadWebhooks } = require("../src/routes");

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
