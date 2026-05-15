const { send } = require("../discord");
const { t } = require("../i18n");

function handleIssueComment(payload, event) {
  if (payload.action !== "created") return;
  const { comment, issue, repository, sender } = payload;

  const seeMore = `\n\n[${t("seeMore")}](${comment.html_url})`;
  const description = (comment.body || "").slice(0, 300) + seeMore;

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("issueComment.title", { number: issue.number, title: issue.title }),
    description,
    url: comment.html_url,
    color: 0x58a6ff,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
    ],
  }, event);
}

module.exports = { handleIssueComment };
