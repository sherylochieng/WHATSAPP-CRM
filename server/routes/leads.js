// server/routes/leads.js
const express = require("express");
const db = require("../db");

const router = express.Router();

const VALID_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "lost",
];

// GET /api/leads?search=&status=&page=&pageSize=
router.get("/", (req, res) => {
  const search = (req.query.search || "").trim();
  const status = (req.query.status || "").trim();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const pageSize = Math.min(100, parseInt(req.query.pageSize) || 25);
  const offset = (page - 1) * pageSize;

  const where = [];
  const params = [];

  if (search) {
    where.push("(name LIKE ? OR wa_phone LIKE ? OR email LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (status && VALID_STATUSES.includes(status)) {
    where.push("status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const total = db
    .prepare(`SELECT COUNT(*) AS n FROM leads ${whereSql}`)
    .get(...params).n;

  const rows = db
    .prepare(
      `SELECT * FROM leads
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset);

  res.json({ total, page, pageSize, leads: rows });
});

// GET /api/leads/:id -- lead detail + full conversation
router.get("/:id", (req, res) => {
  const lead = db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(req.params.id);

  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const messages = db
    .prepare(
      `SELECT id, direction, body, created_at
       FROM messages
       WHERE lead_id = ?
       ORDER BY created_at ASC`
    )
    .all(req.params.id);

  const conversation = db
    .prepare("SELECT state, last_message_at FROM conversations WHERE lead_id = ?")
    .get(req.params.id);

  res.json({ ...lead, messages, conversation });
});

// PATCH /api/leads/:id -- update status, notes, assigned_to
router.patch("/:id", (req, res) => {
  const lead = db
    .prepare("SELECT id FROM leads WHERE id = ?")
    .get(req.params.id);
  if (!lead) return res.status(404).json({ error: "Lead not found" });

  const { status, notes, assigned_to } = req.body;

  if (status && !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const fields = [];
  const params = [];
  if (status !== undefined) {
    fields.push("status = ?");
    params.push(status);
  }
  if (notes !== undefined) {
    fields.push("notes = ?");
    params.push(notes);
  }
  if (assigned_to !== undefined) {
    fields.push("assigned_to = ?");
    params.push(assigned_to);
  }
  if (fields.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  fields.push("updated_at = datetime('now')");
  params.push(req.params.id);

  db.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).run(
    ...params
  );

  const updated = db
    .prepare("SELECT * FROM leads WHERE id = ?")
    .get(req.params.id);
  res.json(updated);
});

module.exports = router;