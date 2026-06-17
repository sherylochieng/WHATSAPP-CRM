// server/routes/stats.js
const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/stats -- dashboard summary
router.get("/", (_req, res) => {
  const total = db.prepare("SELECT COUNT(*) AS n FROM leads").get().n;

  const today = db
    .prepare(
      `SELECT COUNT(*) AS n
       FROM leads
       WHERE date(created_at) = date('now')`
    )
    .get().n;

  const byStatusRows = db
    .prepare(
      `SELECT status, COUNT(*) AS n
       FROM leads
       GROUP BY status`
    )
    .all();

  const byStatus = byStatusRows.reduce((acc, r) => {
    acc[r.status] = r.n;
    return acc;
  }, {});

  res.json({
    total,
    today,
    byStatus: {
      new: byStatus.new || 0,
      contacted: byStatus.contacted || 0,
      qualified: byStatus.qualified || 0,
      converted: byStatus.converted || 0,
      lost: byStatus.lost || 0,
    },
  });
});

module.exports = router;