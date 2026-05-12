const { sendContainer } = require("../discord");
const { buildContainer } = require("../components");

function handleIssueComment(payload) {
  if (payload.action !== "created") return;
  const { comment, issue, repository, sender } = payload;

  const seeMore = `\n\n[See more](${comment.html_url})`;
  const description = (comment.body || "").slice(0, 300) + seeMore;

  sendContainer(buildContainer({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `Commented on #${issue.number}: ${issue.title}`,
    description,
    url: comment.html_url,
    color: 0x58a6ff,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
    ],
  }));
}

module.exports = { handleIssueComment };
