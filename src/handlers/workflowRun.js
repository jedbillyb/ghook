const { send } = require("../discord");

const CONCLUSIONS = {
  success: { color: 0x238636, label: "Succeeded" },
  failure: { color: 0xf85149, label: "Failed" },
  cancelled: { color: 0x6e7681, label: "Cancelled" },
  timed_out: { color: 0xf85149, label: "Timed out" },
  action_required: { color: 0xd29922, label: "Action required" },
};

function handleWorkflowRun(payload) {
  if (payload.action !== "completed") return;

  const { workflow_run: run, repository, sender } = payload;
  const conclusion = CONCLUSIONS[run.conclusion];
  if (!conclusion) return;

  const shortSha = run.head_sha ? run.head_sha.slice(0, 7) : "";
  const commitLink = shortSha
    ? `[\`${shortSha}\`](${repository.html_url}/commit/${run.head_sha})`
    : "";

  const descriptionParts = [];
  if (run.head_branch) descriptionParts.push(`Branch \`${run.head_branch}\``);
  if (commitLink) descriptionParts.push(commitLink);

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: `${run.name}: ${conclusion.label}`,
    description: descriptionParts.join(" • "),
    url: run.html_url,
    color: conclusion.color,
    fields: [
      { name: "Repository", value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: "Workflow", value: run.name, inline: true },
      { name: "Event", value: run.event || "unknown", inline: true },
    ],
  });
}

module.exports = { handleWorkflowRun };
