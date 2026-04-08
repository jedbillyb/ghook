const { sendEmbed } = require("../discord");

const COLORS = { opened: 0x238636, closed: 0xf85149, merged: 0xa371f7 };
const LABELS = { opened: "Opened", closed: "Closed", merged: "Merged" };

function handlePullRequest(payload) {
  const { action, pull_request: pr, repository, sender } = payload;
  if (!["opened", "closed", "reopened"].includes(action)) return;

  const state = pr.merged ? "merged" : action;

  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `#${pr.number} ${pr.title}`,
    description: (pr.body || "").slice(0, 300) || "",
    url: pr.html_url,
    color: COLORS[state] || 0x58a6ff,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Status", value: LABELS[state], inline: true },
      { name: "Branch", value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: false },
    ],
    footer: { text: "ghook", icon_url: "https://github.com/jedbillyb.png" },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handlePullRequest };
