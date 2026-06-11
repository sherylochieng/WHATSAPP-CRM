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

module.exports = {
  findOrCreateLead,
  getConversation,
  setState,
  updateLead,
  logMessage,
};