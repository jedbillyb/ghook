const { sendEmbed } = require("../discord");

function handleFork(payload) {
  const { forkee, repository, sender } = payload;
  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `Forked ${repository.full_name}`,
    description: `Created [${forkee.full_name}](${forkee.html_url})`,
    url: forkee.html_url,
    color: 0xa371f7,
    fields: [
      { name: "Total Forks", value: `🍴 ${repository.forks_count.toLocaleString()}`, inline: true },
      { name: "Original", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
    ],
    footer: { text: "ghook", icon_url: "https://github.com/jedbillyb.png" },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleFork };
