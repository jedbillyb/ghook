const en = require("./en.json");
const fr = require("./fr.json");

const LOCALES = { en, fr };
const DEFAULT_LOCALE = "en";

function resolveLocale(raw) {
  if (!raw) return DEFAULT_LOCALE;
  const normalized = String(raw).toLowerCase().split(/[-_]/)[0];
  return LOCALES[normalized] ? normalized : DEFAULT_LOCALE;
}

const activeLocale = resolveLocale(process.env.LOCALE);
const strings = LOCALES[activeLocale];
const fallback = LOCALES[DEFAULT_LOCALE];

function interpolate(template, vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
  );
}

/**
 * Translate a key with optional interpolation variables.
 * If `vars.count` is provided, `{key}.one` / `{key}.other` suffixes are
 * picked automatically.
 */
function t(key, vars) {
  let resolvedKey = key;
  if (vars && typeof vars.count === "number") {
    const suffix = vars.count === 1 ? ".one" : ".other";
    if (strings[key + suffix] || fallback[key + suffix]) {
      resolvedKey = key + suffix;
    }
  }
  const template = strings[resolvedKey] ?? fallback[resolvedKey] ?? resolvedKey;
  return interpolate(template, vars);
}

module.exports = { t, resolveLocale, activeLocale };
