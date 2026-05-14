const crypto = require("crypto");

const SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

function verifySignature(rawBody, signature) {
  if (!signature) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const signatureBuf = Buffer.from(signature);
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

module.exports = { verifySignature };
