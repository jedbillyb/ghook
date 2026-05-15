const WEBHOOK_PREFIX = "DISCORD_WEBHOOK_";
const DEFAULT_WEBHOOK_SUFFIX = "URL";

function loadWebhooks(env) {
  const map = new Map();
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith(WEBHOOK_PREFIX)) continue;
    if (typeof value !== "string" || value.length === 0) continue;
    map.set(key.slice(WEBHOOK_PREFIX.length), value);
  }
  return map;
}

function parseRoutes(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rule) => {
      const idx = rule.indexOf(":");
      if (idx === -1) return null;
      const event = rule.slice(0, idx).trim();
      const target = rule.slice(idx + 1).trim();
      if (!event || !target) return null;
      return { event, target };
    })
    .filter(Boolean);
}

function buildResolver(env = process.env) {
  const webhooks = loadWebhooks(env);
  const rules = parseRoutes(env.ROUTES);
  const defaultUrl = webhooks.get(DEFAULT_WEBHOOK_SUFFIX) || "";

  for (const rule of rules) {
    if (!webhooks.has(rule.target)) {
      console.warn(
        `ROUTES references unknown webhook "${rule.target}" for event "${rule.event}" — ` +
        `set ${WEBHOOK_PREFIX}${rule.target} to enable this route.`
      );
    }
  }

  function resolve(event) {
    for (const rule of rules) {
      if (rule.event === event) {
        const url = webhooks.get(rule.target);
        if (url) return url;
      }
    }
    return defaultUrl;
  }

  return { resolve, webhooks, rules };
}

module.exports = { buildResolver, parseRoutes, loadWebhooks };
