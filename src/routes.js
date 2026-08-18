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

function parsePathRoutes(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((rule) => {
      const idx = rule.indexOf(":");
      if (idx === -1) return null;
      const pattern = rule.slice(0, idx).trim();
      const target = rule.slice(idx + 1).trim();
      if (!pattern || !target) return null;
      return { pattern, target };
    })
    .filter(Boolean);
}

function toPathRegex(pattern) {
  const source = pattern
    .split("**")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${source}$`);
}

function collectPaths(payload) {
  if (!payload || !Array.isArray(payload.commits)) return [];
  const paths = [];
  for (const commit of payload.commits) {
    for (const key of ["added", "modified", "removed"]) {
      if (Array.isArray(commit[key])) paths.push(...commit[key]);
    }
  }
  return paths;
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

  const polledTargets = [env.WATCH_REPOS, env.WATCH_ORGS, env.WATCH_USERS].some(Boolean);
  if (env.PATH_ROUTES && polledTargets) {
    console.warn(
      "PATH_ROUTES has no effect on polled targets — GitHub's Events API omits the " +
      "file lists it matches on, so WATCH_REPOS, WATCH_ORGS and WATCH_USERS events " +
      "fall through to ROUTES. Path routing requires webhook delivery."
    );
  }

  const pathRules = parsePathRoutes(env.PATH_ROUTES).map((rule) => {
    if (!webhooks.has(rule.target)) {
      console.warn(
        `PATH_ROUTES references unknown webhook "${rule.target}" for pattern "${rule.pattern}" — ` +
        `set ${WEBHOOK_PREFIX}${rule.target} to enable this route.`
      );
    }
    return { ...rule, regex: toPathRegex(rule.pattern) };
  });

  function resolve(event, payload) {
    const paths = event === "push" ? collectPaths(payload) : [];
    if (paths.length > 0) {
      for (const rule of pathRules) {
        if (paths.some((path) => rule.regex.test(path))) {
          const url = webhooks.get(rule.target);
          if (url) return url;
        }
      }
    }
    for (const rule of rules) {
      if (rule.event === event) {
        const url = webhooks.get(rule.target);
        if (url) return url;
      }
    }
    return defaultUrl;
  }

  return { resolve, webhooks, rules, pathRules };
}

module.exports = {
  buildResolver,
  parseRoutes,
  parsePathRoutes,
  collectPaths,
  loadWebhooks,
};
