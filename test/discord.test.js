const test = require("node:test");
const assert = require("node:assert/strict");
const https = require("node:https");

function freshSend(env = {}) {
  for (const key of ["DISCORD_LEGACY_EMBEDS", "WEBHOOK_FOOTER", "WEBHOOK_FOOTER_URL"]) {
    delete process.env[key];
  }
  process.env.DISCORD_WEBHOOK_URL = "https://discord.example/api/webhooks/1/abc";
  Object.assign(process.env, env);

  delete require.cache[require.resolve("../src/discord")];
  delete require.cache[require.resolve("../src/components")];
  return require("../src/discord").send;
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

test("send routes to Components V2 by default", (t) => {
  const calls = captureRequest(t);
  const send = freshSend();
  send({ title: "x", footer: { text: "f" } });

  assert.equal(calls.length, 1);
  const body = JSON.parse(calls[0].body);
  assert.ok("flags" in body, "expected V2 flags field");
  assert.ok(Array.isArray(body.components), "expected V2 components array");
  assert.equal(body.components[0].type, 17);
  assert.equal("embeds" in body, false);
  assert.match(calls[0].opts.path, /\?with_components=true/);
});

test("send routes to legacy embeds when DISCORD_LEGACY_EMBEDS=true", (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ DISCORD_LEGACY_EMBEDS: "true" });
  send({ title: "x", description: "d", color: 0x238636, footer: { text: "f" } });

  const body = JSON.parse(calls[0].body);
  assert.ok(Array.isArray(body.embeds));
  assert.equal(body.embeds[0].title, "x");
  assert.equal(body.embeds[0].description, "d");
  assert.equal(body.embeds[0].color, 0x238636);
  assert.equal("flags" in body, false);
  assert.equal("components" in body, false);
  assert.doesNotMatch(calls[0].opts.path, /with_components/);
});

test("legacy embed propagates inline flags faithfully", (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ DISCORD_LEGACY_EMBEDS: "true" });
  send({
    title: "x",
    fields: [
      { name: "A", value: "1", inline: true },
      { name: "B", value: "2", inline: false },
    ],
  });

  const embed = JSON.parse(calls[0].body).embeds[0];
  assert.deepEqual(
    embed.fields.map((f) => f.inline),
    [true, false]
  );
});

test("legacy embed footer is text only (Discord does not render Markdown there)", (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ DISCORD_LEGACY_EMBEDS: "true", WEBHOOK_FOOTER: "my-text", WEBHOOK_FOOTER_URL: "https://example.com" });
  send({ title: "x" });

  const embed = JSON.parse(calls[0].body).embeds[0];
  assert.equal(embed.footer.text, "my-text");
  assert.equal("url" in embed.footer, false);
});

test("V2 footer uses WEBHOOK_FOOTER text and WEBHOOK_FOOTER_URL link", (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ WEBHOOK_FOOTER: "my-fork/ghook", WEBHOOK_FOOTER_URL: "https://example.com/my-fork" });
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  const footer = body.components[0].components.find((c) => c.content?.startsWith("-#"));
  assert.match(footer.content, /\[my-fork\/ghook\]\(https:\/\/example\.com\/my-fork\)/);
});

test("V2 footer falls back to upstream URL when only WEBHOOK_FOOTER is set", (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ WEBHOOK_FOOTER: "my-fork/ghook" });
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  const footer = body.components[0].components.find((c) => c.content?.startsWith("-#"));
  assert.match(footer.content, /\[my-fork\/ghook\]\(https:\/\/github\.com\/jedbillyb\/ghook\)/);
});

test('WEBHOOK_FOOTER_URL="" disables the clickable link', (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ WEBHOOK_FOOTER: "plain", WEBHOOK_FOOTER_URL: "" });
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  const footer = body.components[0].components.find((c) => c.content?.startsWith("-#"));
  assert.match(footer.content, /^-# plain /);
  assert.doesNotMatch(footer.content, /\[plain\]/);
});

test("default footer text is github.com/jedbillyb/ghook", (t) => {
  const calls = captureRequest(t);
  const send = freshSend();
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  const footer = body.components[0].components.find((c) => c.content?.startsWith("-#"));
  assert.match(footer.content, /github\.com\/jedbillyb\/ghook/);
});

test('WEBHOOK_FOOTER="" drops the attribution and keeps the timestamp', (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ WEBHOOK_FOOTER: "" });
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  const footer = body.components[0].components.find((c) => c.content?.startsWith("-#"));
  assert.ok(footer, "expected the footer line to remain for the timestamp");
  assert.doesNotMatch(footer.content, /ghook/);
  assert.match(footer.content, /<t:\d+:R>/);
});

test('WEBHOOK_FOOTER="" drops the footer entirely in legacy embeds', (t) => {
  const calls = captureRequest(t);
  const send = freshSend({ DISCORD_LEGACY_EMBEDS: "true", WEBHOOK_FOOTER: "" });
  send({ title: "x" });

  const body = JSON.parse(calls[0].body);
  assert.equal(body.embeds[0].footer, undefined);
});

function captureWithResponses(t, responses) {
  const calls = [];
  const original = https.request;
  https.request = (opts, cb) => {
    const call = { opts, body: "" };
    calls.push(call);
    const spec = responses[calls.length - 1] || { statusCode: 204 };
    return {
      on() {},
      write(data) { call.body += data; },
      end() {
        const listeners = {};
        const res = {
          statusCode: spec.statusCode,
          statusMessage: spec.statusMessage || "",
          headers: spec.headers || {},
          setEncoding() {},
          resume() {},
          on(evt, fn) {
            (listeners[evt] = listeners[evt] || []).push(fn);
            return res;
          },
        };
        if (cb) cb(res);
        if (spec.body) for (const fn of listeners.data || []) fn(spec.body);
        for (const fn of listeners.end || []) fn();
      },
    };
  };
  t.after(() => { https.request = original; });
  return calls;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("429 is retried using retry_after from the response body", async (t) => {
  const calls = captureWithResponses(t, [
    { statusCode: 429, body: JSON.stringify({ retry_after: 0.01 }) },
    { statusCode: 204 },
  ]);
  const send = freshSend();
  send({ title: "x" });

  assert.equal(calls.length, 1);
  await wait(60);
  assert.equal(calls.length, 2, "expected the message to be sent again");
  assert.equal(calls[0].body, calls[1].body, "expected the same payload to be resent");
});

test("429 falls back to the Retry-After header when the body has no retry_after", async (t) => {
  const calls = captureWithResponses(t, [
    { statusCode: 429, headers: { "retry-after": "0.01" }, body: "not json" },
    { statusCode: 204 },
  ]);
  const send = freshSend();
  send({ title: "x" });

  await wait(60);
  assert.equal(calls.length, 2);
});

test("429 gives up after MAX_RETRIES instead of retrying forever", async (t) => {
  const rateLimited = { statusCode: 429, body: JSON.stringify({ retry_after: 0.01 }) };
  const calls = captureWithResponses(t, [rateLimited, rateLimited, rateLimited, rateLimited]);
  const send = freshSend();
  send({ title: "x" });

  await wait(150);
  assert.equal(calls.length, 3, "expected the initial attempt plus two retries");
});

test("non-429 errors are not retried", async (t) => {
  const calls = captureWithResponses(t, [
    { statusCode: 400, body: JSON.stringify({ message: "bad" }) },
    { statusCode: 204 },
  ]);
  const send = freshSend();
  send({ title: "x" });

  await wait(60);
  assert.equal(calls.length, 1);
});
