const test = require("node:test");
const assert = require("node:assert/strict");
const https = require("node:https");

function freshHandler() {
  process.env.DISCORD_WEBHOOK_URL = "https://discord.example/api/webhooks/1/abc";
  delete process.env.DISCORD_LEGACY_EMBEDS;
  delete require.cache[require.resolve("../src/discord")];
  delete require.cache[require.resolve("../src/components")];
  delete require.cache[require.resolve("../src/handlers/workflowRun")];
  return require("../src/handlers/workflowRun").handleWorkflowRun;
}

function collectTexts(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.type === 10 && typeof node.content === "string") out.push(node.content);
  if (Array.isArray(node.components)) {
    for (const child of node.components) collectTexts(child, out);
  }
  return out;
}

function captureRequest(t) {
  const calls = [];
  const original = https.request;
  https.request = (opts) => {
    const call = { opts, body: "" };
    calls.push(call);
    return {
      on() {},
      write(data) { call.body += data; },
      end() {},
    };
  };
  t.after(() => { https.request = original; });
  return calls;
}

function basePayload() {
  return {
    action: "completed",
    workflow_run: {
      name: "CI",
      head_branch: "main",
      head_sha: "abcdef1234567890",
      html_url: "https://github.com/a/b/actions/runs/1",
      conclusion: "success",
      event: "push",
    },
    repository: {
      full_name: "a/b",
      html_url: "https://github.com/a/b",
      private: false,
    },
    sender: {
      login: "alice",
      avatar_url: "https://github.com/alice.png",
    },
  };
}

function payload({ action, run = {} } = {}) {
  const p = basePayload();
  if (action !== undefined) p.action = action;
  Object.assign(p.workflow_run, run);
  return p;
}

test("ignores non-completed actions (requested, in_progress)", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ action: "requested" }));
  handle(payload({ action: "in_progress" }));
  assert.equal(calls.length, 0);
});

test("ignores conclusions that are not actionable (skipped, neutral, stale)", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  for (const conclusion of ["skipped", "neutral", "stale", null, undefined]) {
    handle(payload({ run: { conclusion } }));
  }
  assert.equal(calls.length, 0);
});

test("sends a green message on success", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { conclusion: "success" } }));
  assert.equal(calls.length, 1);
  const container = JSON.parse(calls[0].body).components[0];
  assert.equal(container.accent_color, 0x238636);
  const texts = collectTexts(container);
  assert.ok(texts.some((t) => t.includes("CI: Succeeded")));
});

test("sends a red message on failure", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { conclusion: "failure" } }));
  const container = JSON.parse(calls[0].body).components[0];
  assert.equal(container.accent_color, 0xf85149);
  assert.ok(collectTexts(container).some((t) => t.includes("Failed")));
});

test("sends a grey message on cancellation", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { conclusion: "cancelled" } }));
  const container = JSON.parse(calls[0].body).components[0];
  assert.equal(container.accent_color, 0x6e7681);
});

test("sends a red message on timed_out", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { conclusion: "timed_out" } }));
  const container = JSON.parse(calls[0].body).components[0];
  assert.equal(container.accent_color, 0xf85149);
  assert.ok(collectTexts(container).some((t) => t.includes("Timed out")));
});

test("sends an orange message on action_required", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { conclusion: "action_required" } }));
  const container = JSON.parse(calls[0].body).components[0];
  assert.equal(container.accent_color, 0xd29922);
});

test("description includes branch and a short SHA link to the commit", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { head_branch: "develop", head_sha: "1234567abcdef" } }));
  const texts = collectTexts(JSON.parse(calls[0].body).components[0]);
  const desc = texts.find((t) => t.includes("Branch"));
  assert.match(desc, /Branch `develop`/);
  assert.match(desc, /\[`1234567`\]\(https:\/\/github\.com\/a\/b\/commit\/1234567abcdef\)/);
});

test("fields include repository, workflow name and triggering event", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  handle(payload({ run: { name: "Deploy", event: "pull_request" } }));
  const texts = collectTexts(JSON.parse(calls[0].body).components[0]);
  const fieldsText = texts.find((t) => t.includes("**Repository**"));
  assert.match(fieldsText, /\*\*Repository\*\* \[a\/b\]/);
  assert.match(fieldsText, /\*\*Workflow\*\* Deploy/);
  assert.match(fieldsText, /\*\*Event\*\* pull_request/);
});

test("handles missing head_sha and head_branch gracefully", (t) => {
  const handle = freshHandler();
  const calls = captureRequest(t);
  const p = payload();
  delete p.workflow_run.head_sha;
  delete p.workflow_run.head_branch;
  handle(p);
  assert.equal(calls.length, 1);
});
