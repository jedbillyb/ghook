const { send } = require("../discord");
const { bufferEvent, suppressEvent } = require("../utils/buffer");
const { t } = require("../i18n");

const ACTIONS = ["published", "released", "prereleased"];

function handleRelease(payload, event) {
  const { action, release, repository, sender } = payload;
  if (!ACTIONS.includes(action)) return;

  const releaseKey = `release:${repository.full_name}:${release.tag_name}`;

  // Suppress the tag/push events that GitHub fires alongside the release
  suppressEvent(`tag:${repository.full_name}:refs/tags/${release.tag_name}`);

  // Deduplicate - GitHub fires published/released/prereleased simultaneously
  bufferEvent(releaseKey, payload, (finalPayload) => sendReleaseMessage(finalPayload, event), 2000);
}

function sendReleaseMessage(payload, event) {
  const { release, repository, sender } = payload;
  const isPrerelease = release.prerelease;
  const color = isPrerelease ? 0xe3b341 : 0x238636;
  const label = isPrerelease ? t("release.type.prerelease") : t("release.type.release");

  const seeMore = `\n\n[${t("seeMore")}](${release.html_url})`;
  const description = (release.body || "").slice(0, 400) + seeMore;

  send({
    author: {
      name: sender.login,
      url: `https://github.com/${sender.login}`,
      icon_url: sender.avatar_url,
    },
    title: release.name || release.tag_name,
    description,
    url: release.html_url,
    color,
    fields: [
      { name: t("field.repository"), value: `[${repository.full_name}](${repository.html_url})`, inline: true },
      { name: t("field.tag"), value: `\`${release.tag_name}\``, inline: true },
      { name: t("field.type"), value: label, inline: true },
    ],
  }, event);
}

module.exports = { handleRelease };
