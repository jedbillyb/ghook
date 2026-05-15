const { send } = require("../discord");
const { t } = require("../i18n");

function handleDelete(payload, event) {
  const { ref_type, ref, repository, sender } = payload;
  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("delete.title", { refType: t(`refType.${ref_type}`), ref }),
    url: repository.html_url,
    color: 0xf85149,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.type"), value: t(`refTypeLabel.${ref_type}`), inline: true },
    ],
  }, event);
}

module.exports = { handleDelete };
