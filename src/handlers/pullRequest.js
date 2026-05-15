const { send } = require("../discord");
const { t } = require("../i18n");

const COLORS = { opened: 0x238636, closed: 0xf85149, merged: 0xa371f7 };
const KNOWN_STATES = new Set(["opened", "closed", "merged", "reopened"]);

function handlePullRequest(payload) {
  const { action, pull_request: pr, repository, sender } = payload;
  if (!["opened", "closed", "reopened"].includes(action)) return;

  const state = pr.merged ? "merged" : action;

  const seeMore = `\n\n[${t("seeMore")}](${pr.html_url})`;
  const description = (pr.body || "").slice(0, 300) + seeMore;

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("pr.title", { number: pr.number, title: pr.title }),
    description,
    url: repository.html_url,
    color: COLORS[state] || 0x58a6ff,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.status"), value: KNOWN_STATES.has(state) ? t(`pr.status.${state}`) : state, inline: true },
      { name: t("field.branch"), value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: false },
    ],
  });
}

module.exports = { handlePullRequest };
