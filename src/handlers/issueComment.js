const { sendEmbed } = require("../discord");

function handleIssueComment(payload) {
  if (payload.action !== "created") return;
  const { comment, issue, repository, sender } = payload;

  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `Commented on #${issue.number}: ${issue.title}`,
    description: (comment.body || "").slice(0, 300),
    url: comment.html_url,
    color: 0x58a6ff,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
    ],
    footer: {
      text: "GitHub • Comment",
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleIssueComment };
