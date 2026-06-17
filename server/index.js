// server/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const webhookRoutes = require('./routes/webhook');
//additional route imports will go here in Days 3-4
const leadRoutes = require('./routes/leads');
const statsRoutes = require('./routes/stats');

const app = express();

// Middleware -- same as Week 10
app.use(cors());
// IMPORTANT: we need the raw request body later (Day 2) to verify Meta's
// HMAC signature. express.json's `verify` callback runs before parsing
// and lets us stash the raw bytes on req.rawBody.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }),
);

app.use('/webhook', webhookRoutes);
//additional routes for lead management and stats will go here in Days 3-4
app.use('/api/leads', leadRoutes);
app.use('/api/stats', statsRoutes);

// Placeholder routes for Days 3-4
// app.use("/api/leads", (_req, res) =>
//   res.status(501).json({ error: "Coming on Day 3" })
// );
// app.use("/api/stats", (_req, res) =>
//   res.status(501).json({ error: "Coming on Day 3" })
// );

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
