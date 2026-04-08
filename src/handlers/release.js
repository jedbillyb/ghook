const { sendEmbed } = require("../discord");

const ACTIONS = ["published", "released", "prereleased"];

function handleRelease(payload) {
  const { action, release, repository, sender } = payload;
  if (!ACTIONS.includes(action)) return;

  const isPrerelease = release.prerelease;
  const color = isPrerelease ? 0xe3b341 : 0x238636;
  const label = isPrerelease ? "Pre-release" : "Release";

  sendEmbed({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `${isPrerelease ? "🔖" : "🚀"} ${release.name || release.tag_name}`,
    description: (release.body || "").slice(0, 400) || "",
    url: release.html_url,
    color,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Tag", value: `\`${release.tag_name}\``, inline: true },
      { name: "Type", value: label, inline: true },
    ],
    footer: {
      text: "ghook",
      icon_url: "https://github.com/jedbillyb.png",
    },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handleRelease };
