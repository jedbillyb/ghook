const { sendEmbed } = require("../discord");

const COLORS = { opened: 0x238636, closed: 0xf85149, reopened: 0xd29922, edited: 0x58a6ff };
const LABELS = { opened: "Opened", closed: "Closed", reopened: "Reopened", edited: "Edited" };

function handleIssues(payload) {
  const { action, issue, repository, sender } = payload;
  if (!LABELS[action]) return;

  const seeMore = `\n\n[See more](${issue.html_url})`;
  const description = (issue.body || "").slice(0, 300) + seeMore;

  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `Issue #${issue.number}: ${issue.title}`,
    description,
    url: issue.html_url,
    color: COLORS[action] || 0x58a6ff,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Type", value: "Issue", inline: true },
      { name: "Status", value: LABELS[action], inline: true },
    ],
    footer: { 
      text: repository.full_name, 
      icon_url: "https://raw.githubusercontent.com/jedbillyb/ghook/main/assets/android-chrome-512x512-g.png" 
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleIssues };
