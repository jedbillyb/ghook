const https = require("https");
const { buildContainer } = require("./components");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const LEGACY_EMBEDS = process.env.DISCORD_LEGACY_EMBEDS === "true";
const FOOTER_TEXT = process.env.WEBHOOK_FOOTER || "github.com/jedbillyb/ghook";
const FOOTER_URL = process.env.WEBHOOK_FOOTER_URL || "https://github.com/jedbillyb/ghook";
const FLAG_IS_COMPONENTS_V2 = 1 << 15;

function post(body, { withComponents } = {}) {
  const payload = JSON.stringify(body);
  const parsed = new URL(WEBHOOK_URL);
  const search = new URLSearchParams(parsed.search);
  if (withComponents) search.set("with_components", "true");

  const options = {
    hostname: parsed.hostname,
    path: search.toString() ? `${parsed.pathname}?${search.toString()}` : parsed.pathname,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode >= 400) console.error(`Discord API error: ${res.statusCode}`);
  });
  req.on("error", (e) => console.error("Discord send error:", e.message));
  req.write(payload);
  req.end();
}

function specWithFooter(spec) {
  if (spec.footer) return spec;
  return { ...spec, footer: { text: FOOTER_TEXT, url: FOOTER_URL } };
}

function sendV2(spec) {
  const container = buildContainer(specWithFooter(spec));
  post({ flags: FLAG_IS_COMPONENTS_V2, components: [container] }, { withComponents: true });
}

function sendLegacy(spec) {
  const embed = toLegacyEmbed(specWithFooter(spec));
  post({ embeds: [embed] });
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
  if (LEGACY_EMBEDS) sendLegacy(spec);
  else sendV2(spec);
}

module.exports = { send };
