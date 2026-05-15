const { send } = require("../discord");
const { bufferEvent } = require("../utils/buffer");
const { t } = require("../i18n");

function handleCreate(payload) {
  const { ref_type, repository } = payload;

  if (ref_type === "tag") {
    const key = `tag:${repository.full_name}:refs/tags/${payload.ref}`;
    bufferEvent(key, payload, (finalPayload) => sendCreateMessage(finalPayload), 5000);
  } else {
    sendCreateMessage(payload);
  }
}

function sendCreateMessage(payload) {
  const { ref_type, ref, repository, sender } = payload;
  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("create.title", { refType: t(`refType.${ref_type}`), ref }),
    url: `${repository.html_url}/tree/${ref}`,
    color: 0x1f6feb,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.type"), value: t(`refTypeLabel.${ref_type}`), inline: true },
    ],
  });
}

module.exports = { handleCreate };
