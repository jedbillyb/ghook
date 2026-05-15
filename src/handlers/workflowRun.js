const { send } = require("../discord");
const { t } = require("../i18n");

const CONCLUSIONS = {
  success: 0x238636,
  failure: 0xf85149,
  cancelled: 0x6e7681,
  timed_out: 0xf85149,
  action_required: 0xd29922,
};

function handleWorkflowRun(payload, event) {
  if (payload.action !== "completed") return;

  const { workflow_run: run, repository, sender } = payload;
  const color = CONCLUSIONS[run.conclusion];
  if (color === undefined) return;

  const shortSha = run.head_sha ? run.head_sha.slice(0, 7) : "";
  const commitLink = shortSha
    ? `[\`${shortSha}\`](${repository.html_url}/commit/${run.head_sha})`
    : "";

  const descriptionParts = [];
  if (run.head_branch) descriptionParts.push(t("workflow.branchLabel", { branch: run.head_branch }));
  if (commitLink) descriptionParts.push(commitLink);

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: t("workflow.title", { name: run.name, label: t(`workflow.conclusion.${run.conclusion}`) }),
    description: descriptionParts.join(" • "),
    url: run.html_url,
    color,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.workflow"), value: run.name, inline: true },
      { name: t("field.event"), value: run.event || t("workflow.unknownEvent"), inline: true },
    ],
  }, event);
}

module.exports = { handleWorkflowRun };
