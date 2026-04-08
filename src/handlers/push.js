const { sendEmbed } = require("../discord");

function handlePush(payload) {
  const { repository, ref, pusher, commits, compare, sender } = payload;
  const branch = ref.replace("refs/heads/", "");
  const commitList = (commits || []).slice(0, 5).map(
    (c) => `[\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split("\n")[0]}`
  ).join("\n");

  sendEmbed({
    author: {
      name: pusher.name,
      url: `https://github.com/${pusher.name}`,
      icon_url: sender ? sender.avatar_url : `https://github.com/${pusher.name}.png`,
    },
    title: `Pushed ${commits.length} commit${commits.length !== 1 ? "s" : ""} to \`${branch}\``,
    description: commitList || "No commits.",
    url: compare,
    color: 0x238636,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Branch", value: `\`${branch}\``, inline: true },
    ],
    footer: { text: "ghook", icon_url: "https://github.com/jedbillyb.png" },
    timestamp: new Date().toISOString(),
  });
}

module.exports = { handlePush };
