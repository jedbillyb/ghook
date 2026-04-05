require("dotenv").config();
const express = require("express");
const { verifySignature } = require("./verify");
const { routeEvent } = require("./router");

const app = express();
const PORT = process.env.PORT || 3000;

// Parse raw body for signature verification, then JSON
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; }
}));

app.get("/", (_req, res) => res.send("GitHub → Discord bot is running."));

app.post("/webhook", (req, res) => {
  // 1. Verify signature
  const signature = req.headers["x-hub-signature-256"];
  if (!verifySignature(req.rawBody, signature)) {
    console.warn("⚠️  Invalid signature — rejected.");
    return res.status(401).send("Invalid signature");
  }

  // 2. Route to handler
  const event = req.headers["x-github-event"];
  console.log(`📥 Received event: ${event}`);
  routeEvent(event, req.body);

  res.status(200).send("OK");
});

app.listen(PORT, () => console.log(`🚀 Listening on port ${PORT}`));
