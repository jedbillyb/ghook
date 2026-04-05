const { sendEmbed } = require("../discord");

function handleCreate(payload) {
  const { ref_type, ref, repository, sender } = payload;
  sendEmbed({
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
    footer: {
      text: "GitHub • Create",
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleCreate };
