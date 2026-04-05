const https = require("https");
const url = require("url");

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "";

function sendEmbed(embed) {
  const payload = JSON.stringify({ embeds: [embed] });
  const parsed = new URL(WEBHOOK_URL);

  const options = {
    hostname: parsed.hostname,
    path: parsed.pathname + parsed.search,
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

module.exports = { sendEmbed };
