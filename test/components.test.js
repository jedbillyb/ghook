const test = require("node:test");
const assert = require("node:assert/strict");
const { buildContainer } = require("../src/components");

const CONTAINER = 17;
const SECTION = 9;
const TEXT_DISPLAY = 10;
const THUMBNAIL = 11;
const SEPARATOR = 14;

function findText(container, predicate) {
  return container.components.find(
    (c) => c.type === TEXT_DISPLAY && predicate(c.content)
  );
}

test("buildContainer returns a CONTAINER component", () => {
  const c = buildContainer({ title: "Hello" });
  assert.equal(c.type, CONTAINER);
  assert.ok(Array.isArray(c.components));
});

test("buildContainer sets accent_color when color is a number", () => {
  const c = buildContainer({ title: "x", color: 0x238636 });
  assert.equal(c.accent_color, 0x238636);
});

test("buildContainer omits accent_color when color is missing", () => {
  const c = buildContainer({ title: "x" });
  assert.equal("accent_color" in c, false);
});

test("title renders as bold Markdown link when url is provided", () => {
  const c = buildContainer({ title: "Hello", url: "https://example.com" });
  const titleComp = findText(c, (t) => t.includes("Hello"));
  assert.equal(titleComp.content, "**[Hello](https://example.com)**");
});

test("title renders as plain bold when url is missing", () => {
  const c = buildContainer({ title: "Hello" });
  const titleComp = findText(c, (t) => t.includes("Hello"));
  assert.equal(titleComp.content, "**Hello**");
});

test("author with icon_url is wrapped in a Section + Thumbnail", () => {
  const c = buildContainer({
    author: { name: "alice", url: "https://github.com/alice", icon_url: "https://github.com/alice.png" },
    title: "hi",
  });
  const section = c.components.find((x) => x.type === SECTION);
  assert.ok(section, "expected a Section");
  assert.equal(section.accessory.type, THUMBNAIL);
  assert.equal(section.accessory.media.url, "https://github.com/alice.png");
});

test("author without icon_url renders text components flat (no Section)", () => {
  const c = buildContainer({
    author: { name: "alice", url: "https://github.com/alice" },
    title: "hi",
  });
  const section = c.components.find((x) => x.type === SECTION);
  assert.equal(section, undefined);
  const authorText = findText(c, (t) => t.includes("alice"));
  assert.ok(authorText.content.startsWith("-#"));
});

test("inline fields are joined on a single line", () => {
  const c = buildContainer({
    title: "x",
    fields: [
      { name: "A", value: "1", inline: true },
      { name: "B", value: "2", inline: true },
    ],
  });
  const fieldText = findText(c, (t) => t.includes("**A**"));
  assert.equal(fieldText.content, "**A** 1    **B** 2");
});

test("inline=false fields render on their own line", () => {
  const c = buildContainer({
    title: "x",
    fields: [
      { name: "A", value: "1", inline: true },
      { name: "B", value: "2", inline: false },
    ],
  });
  const fieldText = findText(c, (t) => t.includes("**A**"));
  assert.equal(fieldText.content, "**A** 1\n**B** 2");
});

test("footer with url renders as clickable Markdown link in subtext", () => {
  const c = buildContainer({
    title: "x",
    footer: { text: "footer-text", url: "https://example.com" },
  });
  const footer = findText(c, (t) => t.startsWith("-#"));
  assert.match(footer.content, /^-# \[footer-text\]\(https:\/\/example\.com\)/);
});

test("footer without url renders as plain subtext", () => {
  const c = buildContainer({
    title: "x",
    footer: { text: "plain-footer" },
  });
  const footer = findText(c, (t) => t.startsWith("-#") && t.includes("plain-footer"));
  assert.match(footer.content, /^-# plain-footer/);
  assert.doesNotMatch(footer.content, /\[plain-footer\]/);
});

test("footer always includes a relative timestamp", () => {
  const c = buildContainer({ title: "x", footer: { text: "f" } });
  const footer = findText(c, (t) => t.startsWith("-#"));
  assert.match(footer.content, /<t:\d+:R>/);
});

test("explicit timestamp is honoured", () => {
  const c = buildContainer({
    title: "x",
    footer: { text: "f" },
    timestamp: "2024-01-01T00:00:00.000Z",
  });
  const footer = findText(c, (t) => t.startsWith("-#"));
  assert.match(footer.content, /<t:1704067200:R>/);
});

test("separators are inserted between header / fields / footer blocks", () => {
  const c = buildContainer({
    title: "x",
    fields: [{ name: "A", value: "1", inline: true }],
    footer: { text: "f" },
  });
  const separators = c.components.filter((x) => x.type === SEPARATOR);
  assert.equal(separators.length, 2);
});
