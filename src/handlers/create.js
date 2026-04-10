const { sendEmbed } = require("../discord");
const { bufferEvent } = require("../utils/buffer");

function handleCreate(payload) {
  const { ref_type, ref, repository, sender } = payload;
  
  if (ref_type === "tag") {
    const key = `tag:${repository.full_name}:refs/tags/${ref}`;
    bufferEvent(key, payload, (finalPayload) => sendCreateEmbed(finalPayload), 5000);
  } else {
    sendCreateEmbed(payload);
  }
}

function sendCreateEmbed(payload) {
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
      text: repository.full_name, 
      icon_url: "https://raw.githubusercontent.com/jedbillyb/ghook/main/assets/android-chrome-512x512-g.png" 
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleCreate };
