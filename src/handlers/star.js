const { sendEmbed } = require("../discord");

function handleStar(payload) {
  if (payload.action !== "started") return;
  const { repository, sender } = payload;
  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `⭐ ${repository.full_name}`,
    description: repository.description || "",
    url: repository.html_url,
    color: 0xe3b341,
    fields: [
      { name: "Stars", value: `⭐ ${repository.stargazers_count.toLocaleString()}`, inline: true },
      { name: "Forks", value: `🍴 ${repository.forks_count.toLocaleString()}`, inline: true },
      { name: "Language", value: repository.language || "Unknown", inline: true },
    ],
    footer: { 
      text: "https://github.com/jedbillyb/ghook", 
      icon_url: "https://raw.githubusercontent.com/jedbillyb/ghook/main/assets/android-chrome-512x512-g.png" 
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleStar };
