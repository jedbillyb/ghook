const { send } = require("../discord");
const { t, activeLocale } = require("../i18n");

function handleFork(payload) {
  const { forkee, repository, sender } = payload;
  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("fork.title", { repo: repository.full_name }),
    description: t("fork.description", { repo: forkee.full_name, url: forkee.html_url }),
    url: forkee.html_url,
    color: 0xa371f7,
    fields: [
      { name: t("field.totalForks"), value: repository.forks_count.toLocaleString(activeLocale), inline: true },
      { name: t("field.original"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
    ],
  });
}

module.exports = { handleFork };
