const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const SECRET = "test-secret-123";
process.env.GITHUB_WEBHOOK_SECRET = SECRET;

// Require AFTER setting the env var — verify.js reads it at load time.
const { verifySignature } = require("../src/verify");

function sign(body) {
  return "sha256=" + crypto.createHmac("sha256", SECRET).update(body).digest("hex");
}

test("verifySignature accepts a valid signature", () => {
  const body = Buffer.from('{"action":"opened"}');
  assert.equal(verifySignature(body, sign(body)), true);
});

test("verifySignature rejects a tampered body", () => {
  const body = Buffer.from('{"action":"opened"}');
  const tampered = Buffer.from('{"action":"closed"}');
  assert.equal(verifySignature(tampered, sign(body)), false);
});

test("verifySignature rejects a signature with the wrong secret", () => {
  const body = Buffer.from('{"action":"opened"}');
  const wrongSig = "sha256=" + crypto.createHmac("sha256", "wrong-secret").update(body).digest("hex");
  assert.equal(verifySignature(body, wrongSig), false);
});

test("verifySignature returns false when signature header is missing", () => {
  const body = Buffer.from('{"action":"opened"}');
  assert.equal(verifySignature(body, undefined), false);
  assert.equal(verifySignature(body, null), false);
  assert.equal(verifySignature(body, ""), false);
});

test("verifySignature rejects a signature of the wrong length without throwing", () => {
  const body = Buffer.from('{"action":"opened"}');
  assert.equal(verifySignature(body, "sha256=tooshort"), false);
});
