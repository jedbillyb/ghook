const https = require("https");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";
const FLAG_IS_COMPONENTS_V2 = 1 << 15;

function post(body) {
  const payload = JSON.stringify(body);
  const parsed = new URL(WEBHOOK_URL);
  const search = new URLSearchParams(parsed.search);
  search.set("with_components", "true");

  const options = {
    hostname: parsed.hostname,
    path: `${parsed.pathname}?${search.toString()}`,
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

function sendContainer(container) {
  post({ flags: FLAG_IS_COMPONENTS_V2, components: [container] });
}

module.exports = { sendContainer };
