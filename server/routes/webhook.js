// server/routes/webhook.js
const express = require("express");
const router = express.Router();

// GET /webhook -- Meta's verification handshake.
// Meta hits this once when you first register the webhook URL.
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    console.log("Webhook verified");
    return res.status(200).send(challenge);
  }

  console.warn("Webhook verification failed", { mode, token });
  return res.sendStatus(403);
});

// POST /webhook -- real incoming messages.
// For today we just log the payload. Tomorrow we wire it up to the bot.
router.post("/", (req, res) => {
  console.log("Incoming webhook:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

module.exports = router;