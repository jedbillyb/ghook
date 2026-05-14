const test = require("node:test");
const assert = require("node:assert/strict");
const { bufferEvent, suppressEvent } = require("../src/utils/buffer");

test("bufferEvent fires the callback once after the delay elapses", async () => {
  let calls = 0;
  let received = null;
  bufferEvent("k1", { v: 1 }, (p) => { calls++; received = p; }, 30);

  assert.equal(calls, 0, "should not fire immediately");
  await new Promise((r) => setTimeout(r, 60));

  assert.equal(calls, 1);
  assert.deepEqual(received, { v: 1 });
});

test("bufferEvent without merge replaces the pending payload (last write wins)", async () => {
  let received = null;
  bufferEvent("k2", { v: 1 }, (p) => { received = p; }, 30);
  bufferEvent("k2", { v: 2 }, (p) => { received = p; }, 30);

  await new Promise((r) => setTimeout(r, 60));
  assert.equal(received.v, 1, "first callback closes over the original payload reference");
});

test("bufferEvent with merge mutates the existing payload in place", async () => {
  let received = null;
  const merge = (existing, incoming) => {
    existing.items.push(...incoming.items);
  };
  bufferEvent("k3", { items: [1] }, (p) => { received = p; }, 30, merge);
  bufferEvent("k3", { items: [2, 3] }, (p) => { received = p; }, 30, merge);
  bufferEvent("k3", { items: [4] }, (p) => { received = p; }, 30, merge);

  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(received.items, [1, 2, 3, 4]);
});

test("bufferEvent re-arms the timer on each new event for the same key", async () => {
  let fired = false;
  bufferEvent("k4", { v: 1 }, () => { fired = true; }, 40);
  await new Promise((r) => setTimeout(r, 25));
  bufferEvent("k4", { v: 2 }, () => { fired = true; }, 40);
  await new Promise((r) => setTimeout(r, 25));

  assert.equal(fired, false, "timer should have been reset by the second call");

  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fired, true);
});

test("bufferEvent isolates pending events by key", async () => {
  const fired = [];
  bufferEvent("a", { v: 1 }, (p) => fired.push(["a", p.v]), 30);
  bufferEvent("b", { v: 2 }, (p) => fired.push(["b", p.v]), 30);

  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(fired.sort(), [["a", 1], ["b", 2]]);
});

test("suppressEvent cancels a pending callback and returns true", async () => {
  let fired = false;
  bufferEvent("k5", { v: 1 }, () => { fired = true; }, 30);

  const result = suppressEvent("k5");
  assert.equal(result, true);

  await new Promise((r) => setTimeout(r, 60));
  assert.equal(fired, false);
});

test("suppressEvent returns false when there is nothing to suppress", () => {
  assert.equal(suppressEvent("never-buffered"), false);
});
