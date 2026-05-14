const { send } = require("../discord");
const { bufferEvent } = require("../utils/buffer");

function handlePush(payload) {
  const { repository, ref, commits } = payload;

  // Suppress notifications for pushes with no commits (e.g. force pushes/resets)
  if (!commits || commits.length === 0) return;

  const isTag = ref.startsWith("refs/tags/");
  const key = isTag ? `tag:${repository.full_name}:${ref}` : `push:${repository.full_name}:${ref}`;

  // Batching/Suppression logic
  bufferEvent(
    key,
    payload,
    (finalPayload) => sendPushMessage(finalPayload),
    5000,
    (existing, incoming) => {
      existing.commits = [...(existing.commits || []), ...(incoming.commits || [])];
      existing.compare = incoming.compare;
      existing.pusher = incoming.pusher;
      existing.sender = incoming.sender;
    }
  );
}

function sendPushMessage(payload) {
  const { repository, ref, pusher, commits, compare, sender } = payload;
  const isTag = ref.startsWith("refs/tags/");
  const branch = ref.replace("refs/heads/", "").replace("refs/tags/", "");

  const maxCommits = 5;
  const displayCommits = (commits || []).slice(0, maxCommits);
  const remaining = (commits || []).length - maxCommits;

  let commitList = displayCommits.map(
    (c) => `[\`${c.id.slice(0, 7)}\`](${c.url}) ${c.message.split("\n")[0]}`
  ).join("\n");

  if (remaining > 0) {
    commitList += `\n*and ${remaining} more commit${remaining !== 1 ? "s" : ""}...*`;
  }

  send({
    author: {
      name: pusher.name || pusher.login,
      url: `https://github.com/${pusher.name || pusher.login}`,
      icon_url: sender ? sender.avatar_url : `https://github.com/${pusher.name || pusher.login}.png`,
    },
    title: `Pushed ${commits.length} commit${commits.length !== 1 ? "s" : ""} to ${isTag ? "tag" : "branch"} \`${branch}\``,
    description: commitList || "No commits.",
    url: compare,
    color: 0x238636,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: isTag ? "Tag" : "Branch", value: `\`${branch}\``, inline: true },
    ],
  });
}

module.exports = { handlePush };
