const https = require("https");
const { buildContainer } = require("./components");
const { buildResolver } = require("./routes");

const LEGACY_EMBEDS = process.env.DISCORD_LEGACY_EMBEDS === "true";
const FOOTER_TEXT = process.env.WEBHOOK_FOOTER || "github.com/jedbillyb/ghook";
const FOOTER_URL = "WEBHOOK_FOOTER_URL" in process.env
  ? process.env.WEBHOOK_FOOTER_URL
  : "https://github.com/jedbillyb/ghook";
const FLAG_IS_COMPONENTS_V2 = 1 << 15;

const resolver = buildResolver(process.env);
let currentEvent = null;

function setCurrentEvent(event) {
  currentEvent = event;
}

function post(url, body, { withComponents } = {}) {
  if (!url) {
    console.error("Discord send skipped: no webhook URL resolved.");
    return;
  }
  const payload = JSON.stringify(body);
  const parsed = new URL(url);
  const search = new URLSearchParams(parsed.search);
  if (withComponents) search.set("with_components", "true");

  const options = {
    hostname: parsed.hostname,
    path: search.toString() ? `${parsed.pathname}?${search.toString()}` : parsed.pathname,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      res.resume();
      return;
    }
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => {
      console.error(`Discord API error: ${res.statusCode} ${res.statusMessage || ""}`.trim());
      if (body) console.error("Discord response body:", body);
    });
  });
  req.on("error", (e) => console.error("Discord send error:", e.message));
  req.write(payload);
  req.end();
}

function specWithFooter(spec) {
  if (spec.footer) return spec;
  const footer = { text: FOOTER_TEXT };
  if (FOOTER_URL) footer.url = FOOTER_URL;
  return { ...spec, footer };
}

function sendV2(url, spec) {
  const container = buildContainer(specWithFooter(spec));
  post(url, { flags: FLAG_IS_COMPONENTS_V2, components: [container] }, { withComponents: true });
}

function sendLegacy(url, spec) {
  const embed = toLegacyEmbed(specWithFooter(spec));
  post(url, { embeds: [embed] });
}

function toLegacyEmbed(spec) {
  const embed = {};
  if (spec.author) {
    embed.author = { name: spec.author.name };
    if (spec.author.url) embed.author.url = spec.author.url;
    if (spec.author.icon_url) embed.author.icon_url = spec.author.icon_url;
  }
  if (spec.title) embed.title = spec.title;
  if (spec.url) embed.url = spec.url;
  if (spec.description) embed.description = spec.description;
  if (typeof spec.color === "number") embed.color = spec.color;
  if (Array.isArray(spec.fields) && spec.fields.length > 0) {
    embed.fields = spec.fields.map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline !== false,
    }));
  }
  if (spec.footer && spec.footer.text) {
    embed.footer = { text: spec.footer.text };
  }
  embed.timestamp = spec.timestamp || new Date().toISOString();
  return embed;
}

function send(spec) {
  const url = resolver.resolve(currentEvent);
  if (LEGACY_EMBEDS) sendLegacy(url, spec);
  else sendV2(url, spec);
}

module.exports = { send, setCurrentEvent };
