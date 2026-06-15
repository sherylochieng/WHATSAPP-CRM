// server/services/bot.js
const { v4: uuidv4 } = require("uuid");
const db = require("../db");
const { sendText, sendInquiryList } = require("./whatsapp");

// --- Persistence helpers --------------------------------------------------

function findOrCreateLead(waPhone, profileName) {
  let lead = db
    .prepare("SELECT * FROM leads WHERE wa_phone = ?")
    .get(waPhone);

  if (lead) return lead;

  const id = uuidv4();
  db.prepare(
    `INSERT INTO leads (id, wa_phone, name, status)
     VALUES (?, ?, ?, 'new')`
  ).run(id, waPhone, profileName || null);

  db.prepare(
    `INSERT INTO conversations (id, lead_id, state)
     VALUES (?, ?, 'awaiting_name')`
  ).run(uuidv4(), id);

  return db.prepare("SELECT * FROM leads WHERE id = ?").get(id);
}

function getConversation(leadId) {
  return db
    .prepare("SELECT * FROM conversations WHERE lead_id = ?")
    .get(leadId);
}

function setState(leadId, state) {
  db.prepare(
    `UPDATE conversations
     SET state = ?, last_message_at = datetime('now')
     WHERE lead_id = ?`
  ).run(state, leadId);
}

function updateLead(leadId, patch) {
  const fields = Object.keys(patch);
  if (fields.length === 0) return;
  const sets = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => patch[f]);
  db.prepare(
    `UPDATE leads SET ${sets}, updated_at = datetime('now') WHERE id = ?`
  ).run(...values, leadId);
}

function logMessage(leadId, direction, body, rawPayload) {
  db.prepare(
    `INSERT INTO messages (lead_id, direction, body, raw_payload)
     VALUES (?, ?, ?, ?)`
  ).run(leadId, direction, body, JSON.stringify(rawPayload || null));
}
// server/services/bot.js  (add above module.exports)

// --- Validation -----------------------------------------------------------

function looksLikeEmail(str) {
  return typeof str === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
}

function looksLikeName(str) {
  return typeof str === "string" && str.trim().length >= 2;
}
// server/services/bot.js  (continuing)

// --- Conversation handler -------------------------------------------------

async function handleIncoming(message, contact) {
  const waPhone = message.from;
  const profileName = contact?.profile?.name;

  const lead = findOrCreateLead(waPhone, profileName);

  // Pull user-visible text out of whatever message type Meta sent
  let userText = null;
  let listChoiceId = null;

  if (message.type === "text") {
    userText = message.text?.body?.trim();
  } else if (message.type === "interactive") {
    const i = message.interactive;
    if (i?.type === "list_reply") {
      listChoiceId = i.list_reply.id;
      userText = i.list_reply.title;
    } else if (i?.type === "button_reply") {
      userText = i.button_reply.title;
    }
  } else {
    // voice note, image, sticker, location...
    await sendText(
      waPhone,
      "I can only read text messages right now. Could you type your answer?"
    );
    logMessage(lead.id, "inbound", `[${message.type}]`, message);
    return;
  }

  logMessage(lead.id, "inbound", userText, message);

  // Escape hatch: restart
  if (userText && /^(restart|start over|reset)$/i.test(userText)) {
    setState(lead.id, "awaiting_name");
    updateLead(lead.id, { name: null, email: null, inquiry_type: null });
    const reply = "No problem, let's start over. What's your full name?";
    await sendText(waPhone, reply);
    logMessage(lead.id, "outbound", reply);
    return;
  }

  const convo = getConversation(lead.id);

  switch (convo.state) {
    case "awaiting_name": {
      if (!userText || !looksLikeName(userText)) {
        const reply =
          "Hi! Welcome to Mctaba CRM. What's your full name? (at least 2 characters)";
        await sendText(waPhone, reply);
        logMessage(lead.id, "outbound", reply);
        return;
      }
      updateLead(lead.id, { name: userText });
      setState(lead.id, "awaiting_email");
      const reply = `Thanks ${userText.split(" ")[0]}! What's your email address?`;
      await sendText(waPhone, reply);
      logMessage(lead.id, "outbound", reply);
      return;
    }

    case "awaiting_email": {
      if (!looksLikeEmail(userText)) {
        const reply =
          "Hmm, that doesn't look like an email. Could you send it again? Example: yourname@gmail.com";
        await sendText(waPhone, reply);
        logMessage(lead.id, "outbound", reply);
        return;
      }
      updateLead(lead.id, { email: userText });
      setState(lead.id, "awaiting_inquiry_type");
      await sendInquiryList(waPhone);
      logMessage(lead.id, "outbound", "[interactive list: inquiry type]");
      return;
    }

    case "awaiting_inquiry_type": {
      if (!listChoiceId && !userText) {
        await sendInquiryList(waPhone);
        return;
      }
      const inquiry = listChoiceId || userText;
      updateLead(lead.id, { inquiry_type: inquiry });
      setState(lead.id, "confirming");

      const fresh = db
        .prepare("SELECT name, email, inquiry_type FROM leads WHERE id = ?")
        .get(lead.id);
      const reply =
        `Please confirm your details:\n\n` +
        `Name: ${fresh.name}\n` +
        `Email: ${fresh.email}\n` +
        `Inquiry: ${fresh.inquiry_type}\n\n` +
        `Reply "yes" to confirm or "restart" to start over.`;
      await sendText(waPhone, reply);
      logMessage(lead.id, "outbound", reply);
      return;
    }

    case "confirming": {
      if (/^y(es)?$/i.test(userText || "")) {
        setState(lead.id, "complete");
        const reply =
          "Thanks! Your details are saved. Someone from our team will be in touch shortly. To start a new inquiry, type 'restart'.";
        await sendText(waPhone, reply);
        logMessage(lead.id, "outbound", reply);
        return;
      }
      const reply =
        "Reply 'yes' to confirm the details above, or 'restart' to start over.";
      await sendText(waPhone, reply);
      logMessage(lead.id, "outbound", reply);
      return;
    }

    case "complete":
    default: {
      const reply =
        "Thanks! We already have your details. A team member will be in touch. To start a new inquiry, type 'restart'.";
      await sendText(waPhone, reply);
      logMessage(lead.id, "outbound", reply);
      return;
    }
  }
}

module.exports = {
  findOrCreateLead,
  getConversation,
  setState,
  updateLead,
  logMessage,
  handleIncoming,
};