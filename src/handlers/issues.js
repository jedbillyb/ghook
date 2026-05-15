const { send } = require("../discord");
const { t } = require("../i18n");

const COLORS = { opened: 0x238636, closed: 0xf85149, reopened: 0xd29922, edited: 0x58a6ff };

function handleIssues(payload, event) {
  const { action, issue, repository, sender } = payload;
  if (!COLORS[action]) return;

  const seeMore = `\n\n[${t("seeMore")}](${issue.html_url})`;
  const description = (issue.body || "").slice(0, 300) + seeMore;

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("issue.title", { number: issue.number, title: issue.title }),
    description,
    url: issue.html_url,
    color: COLORS[action] || 0x58a6ff,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.type"), value: t("issue.type"), inline: true },
      { name: t("field.status"), value: t(`issue.status.${action}`), inline: true },
    ],
  }, event);
}

module.exports = { handleIssues };
