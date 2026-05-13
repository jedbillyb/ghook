const { send } = require("../discord");
const { bufferEvent } = require("../utils/buffer");

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
    title: `Created ${ref_type} \`${ref}\``,
    url: `${repository.html_url}/tree/${ref}`,
    color: 0x1f6feb,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Type", value: ref_type.charAt(0).toUpperCase() + ref_type.slice(1), inline: true },
    ],
  });
}

module.exports = { handleCreate };
