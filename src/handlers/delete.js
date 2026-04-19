const { sendEmbed } = require("../discord");

function handleDelete(payload) {
  const { ref_type, ref, repository, sender } = payload;
  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `Deleted ${ref_type} \`${ref}\``,
    url: repository.html_url,
    color: 0xf85149,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Type", value: ref_type.charAt(0).toUpperCase() + ref_type.slice(1), inline: true },
    ],
    footer: { 
      text: "https://github.com/jedbillyb/ghook", 
      icon_url: "https://raw.githubusercontent.com/jedbillyb/ghook/main/assets/android-chrome-512x512-g.png" 
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleDelete };
