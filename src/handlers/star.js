const { send } = require("../discord");
const { t, activeLocale } = require("../i18n");

function handleStar(payload, event) {
  if (payload.action !== "started") return;
  const { repository, sender } = payload;
  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: repository.full_name,
    description: repository.description || "",
    url: repository.html_url,
    color: 0xe3b341,
    fields: [
      { name: t("field.stars"), value: repository.stargazers_count.toLocaleString(activeLocale), inline: true },
      { name: t("field.forks"), value: repository.forks_count.toLocaleString(activeLocale), inline: true },
      { name: t("field.language"), value: repository.language || t("star.unknownLanguage"), inline: true },
    ],
  }, event);
}

module.exports = { handleStar };
