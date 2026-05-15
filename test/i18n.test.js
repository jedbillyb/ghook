const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const en = require("../src/i18n/en.json");
const fr = require("../src/i18n/fr.json");

function freshI18n(locale) {
  if (locale === undefined) delete process.env.LOCALE;
  else process.env.LOCALE = locale;
  delete require.cache[require.resolve("../src/i18n")];
  return require("../src/i18n");
}

test("en and fr expose the exact same keys", () => {
  const enKeys = Object.keys(en).sort();
  const frKeys = Object.keys(fr).sort();
  assert.deepEqual(frKeys, enKeys);
});

test("no translation value is empty", () => {
  for (const [k, v] of Object.entries(fr)) {
    assert.ok(typeof v === "string" && v.length > 0, `fr.${k} is empty`);
  }
  for (const [k, v] of Object.entries(en)) {
    assert.ok(typeof v === "string" && v.length > 0, `en.${k} is empty`);
  }
});

test("default locale is en when LOCALE is unset", () => {
  const { t, activeLocale } = freshI18n(undefined);
  assert.equal(activeLocale, "en");
  assert.equal(t("field.repository"), "Repository");
});

test("LOCALE=fr switches active locale", () => {
  const { t, activeLocale } = freshI18n("fr");
  assert.equal(activeLocale, "fr");
  assert.equal(t("field.repository"), "Dépôt");
});

test("unknown locale falls back to en", () => {
  const { t, activeLocale } = freshI18n("xx");
  assert.equal(activeLocale, "en");
  assert.equal(t("field.repository"), "Repository");
});

test("locale tag like fr-FR is normalized to fr", () => {
  const { activeLocale } = freshI18n("fr-FR");
  assert.equal(activeLocale, "fr");
});

test("interpolation substitutes {vars}", () => {
  const { t } = freshI18n("en");
  assert.equal(
    t("create.title", { refType: "branch", ref: "main" }),
    "Created branch `main`"
  );
});

test("missing variables are left as-is", () => {
  const { t } = freshI18n("en");
  assert.equal(t("create.title", { ref: "main" }), "Created {refType} `main`");
});

test("pluralization picks .one for count=1, .other otherwise", () => {
  const { t } = freshI18n("en");
  assert.equal(
    t("push.title.branch", { count: 1, ref: "main" }),
    "Pushed 1 commit to branch `main`"
  );
  assert.equal(
    t("push.title.branch", { count: 5, ref: "main" }),
    "Pushed 5 commits to branch `main`"
  );
  assert.equal(
    t("push.title.branch", { count: 0, ref: "main" }),
    "Pushed 0 commits to branch `main`"
  );
});

test("pluralization works in French", () => {
  const { t } = freshI18n("fr");
  assert.equal(
    t("push.title.branch", { count: 1, ref: "main" }),
    "A poussé 1 commit sur la branche `main`"
  );
  assert.equal(
    t("push.title.branch", { count: 3, ref: "main" }),
    "A poussé 3 commits sur la branche `main`"
  );
});

test("unknown key returns the key itself (safe fallback)", () => {
  const { t } = freshI18n("en");
  assert.equal(t("does.not.exist"), "does.not.exist");
});
