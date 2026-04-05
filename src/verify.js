const crypto = require("crypto");

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

module.exports = { verifySignature };
