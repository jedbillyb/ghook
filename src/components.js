const COMPONENT_TYPE = {
  TEXT_DISPLAY: 10,
  SECTION: 9,
  THUMBNAIL: 11,
  SEPARATOR: 14,
  CONTAINER: 17,
};

function textDisplay(content) {
  return { type: COMPONENT_TYPE.TEXT_DISPLAY, content };
}

function separator(spacing = 1) {
  return { type: COMPONENT_TYPE.SEPARATOR, divider: true, spacing };
}

function headerSection({ author, title, url, description }) {
  const texts = [];
  if (author) {
    const name = author.url ? `[${author.name}](${author.url})` : author.name;
    texts.push(textDisplay(`-# ${name}`));
  }
  if (title) {
    texts.push(textDisplay(url ? `## [${title}](${url})` : `## ${title}`));
  }
  if (description) {
    texts.push(textDisplay(description));
  }
  if (texts.length === 0) return null;

  if (author && author.icon_url) {
    return {
      type: COMPONENT_TYPE.SECTION,
      components: texts,
      accessory: {
        type: COMPONENT_TYPE.THUMBNAIL,
        media: { url: author.icon_url },
      },
    };
  }
  return texts;
}

function fieldsBlock(fields) {
  if (!fields || fields.length === 0) return null;
  const inline = fields.filter((f) => f.inline !== false);
  const block = fields.filter((f) => f.inline === false);
  const lines = [];
  if (inline.length > 0) {
    lines.push(inline.map((f) => `**${f.name}** ${f.value}`).join("    "));
  }
  for (const f of block) {
    lines.push(`**${f.name}** ${f.value}`);
  }
  return textDisplay(lines.join("\n"));
}

function footerLine({ footer, timestamp }) {
  const parts = [];
  if (footer && footer.text) {
    parts.push(footer.url ? `[${footer.text}](${footer.url})` : footer.text);
  }
  if (timestamp) {
    const epochSec = Math.floor(new Date(timestamp).getTime() / 1000);
    if (Number.isFinite(epochSec)) parts.push(`<t:${epochSec}:R>`);
  }
  if (parts.length === 0) return null;
  return textDisplay(`-# ${parts.join(" • ")}`);
}

function buildContainer({ author, title, url, description, color, fields, footer, timestamp }) {
  const components = [];

  const header$ = headerSection({ author, title, url, description });
  if (header$) {
    if (Array.isArray(header$)) {
      components.push(...header$);
    } else {
      components.push(header$);
    }
  }

  const fields$ = fieldsBlock(fields);
  if (fields$) {
    components.push(separator());
    components.push(fields$);
  }

  const footer$ = footerLine({
    footer,
    timestamp: timestamp || new Date().toISOString(),
  });
  if (footer$) {
    components.push(separator());
    components.push(footer$);
  }

  const container = { type: COMPONENT_TYPE.CONTAINER, components };
  if (typeof color === "number") container.accent_color = color;
  return container;
}

module.exports = { buildContainer };
