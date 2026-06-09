// server/index.js

require("dotenv").config(); 
// loads all variables from .env file into process.env so we can access them anywhere

const express = require("express"); 
// imports the express framework

const cors = require("cors");        
// imports cors middleware — allows our React frontend (different port) to talk to this server

const webhookRoutes = require("./routes/webhook"); 
// imports the webhook router we'll create next

const app = express(); 
// creates the express application

app.use(cors()); 
// applies cors to every request — without this, browser blocks frontend requests

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf.toString("utf8");
      // saves the raw request body as a string on req.rawBody
      // we need this tomorrow to verify Meta's HMAC signature
      // once express.json() parses the body, the original bytes are gone forever
      // so we grab them HERE before parsing happens
    },
  })
);
// parses incoming JSON request bodies into req.body

app.use("/webhook", webhookRoutes); 
// any request to /webhook gets handled by our webhook router

app.use("/api/leads", (_req, res) =>
  res.status(501).json({ error: "Coming on Day 3" })
);
// placeholder for the leads API we build on Day 3
// 501 = Not Implemented

app.use("/api/stats", (_req, res) =>
  res.status(501).json({ error: "Coming on Day 3" })
);
// placeholder for the stats API

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
// health check endpoint — visit this to confirm the server is running

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});
// global error handler — catches any error thrown anywhere in the app

const PORT = process.env.PORT || 5000;
// reads PORT from .env, falls back to 5000 if not set

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// starts the server and listens for incoming requests