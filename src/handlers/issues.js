const { sendEmbed } = require("../discord");

const COLORS = { opened: 0x238636, closed: 0xf85149, reopened: 0xe3b341 };
const LABELS = { opened: "Opened", closed: "Closed", reopened: "Reopened" };

function handleIssues(payload) {
  const { action, issue, repository, sender } = payload;
  if (!["opened", "closed", "reopened"].includes(action)) return;

  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `#${issue.number} ${issue.title}`,
    description: (issue.body || "").slice(0, 300) || "",
    url: issue.html_url,
    color: COLORS[action] || 0x58a6ff,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Status", value: LABELS[action], inline: true },
    ],
    footer: { text: "https://github.com/jedbillyb/ghook", icon_url: "https://raw.githubusercontent.com/jedbillyb/ghook/main/assets/android-chrome-512x512-g.png" },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleIssues };
