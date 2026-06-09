// server/db.js

const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "leads.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    wa_phone TEXT NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    inquiry_type TEXT,
    status TEXT DEFAULT 'new',
    notes TEXT,
    assigned_to TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    state TEXT DEFAULT 'awaiting_name',
    last_message_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    body TEXT,
    raw_payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (lead_id) REFERENCES leads(id)
  );
`);

module.exports = db;

// server/db.js

// const Database = require("better-sqlite3"); // loads the better-sqlite3 library so we can create/open SQLite databases
// const path = require("path");               // built-in Node module for building file paths safely across OS types

// const db = new Database(path.join(__dirname, "leads.db")); 
// creates (or opens) a file called leads.db in the same folder as this file
// __dirname = the folder this file lives in (server/)
// path.join() stitches the folder path + filename safely

// db.pragma("journal_mode = WAL");
// WAL = Write-Ahead Logging — allows reading and writing to happen at the same time without locking
// without this, SQLite locks the whole file during a write, which would freeze the server

// db.exec(`
//   CREATE TABLE IF NOT EXISTS leads (
//     -- IF NOT EXISTS = only create the table if it doesn't already exist (safe to run on every server start)
//     id TEXT PRIMARY KEY,           -- unique ID for each lead (we'll generate this with uuid)
//     wa_phone TEXT NOT NULL UNIQUE, -- the customer's WhatsApp number. NOT NULL = required. UNIQUE = no duplicates
//     name TEXT,                     -- customer's name (collected by the bot on Day 2)
//     email TEXT,                    -- customer's email (collected by the bot)
//     inquiry_type TEXT,             -- what they're asking about (property? car? insurance?)
//     status TEXT DEFAULT 'new',     -- where they are in the sales pipeline. defaults to 'new' on creation
//     notes TEXT,                    -- sales team can add notes from the dashboard
//     assigned_to TEXT,              -- which salesperson is handling this lead
//     created_at TEXT DEFAULT (datetime('now')), -- timestamp auto-set when the row is created
//     updated_at TEXT DEFAULT (datetime('now'))  -- timestamp we manually update whenever the lead changes
//   );

//   CREATE TABLE IF NOT EXISTS conversations (
//     id TEXT PRIMARY KEY,
//     lead_id TEXT NOT NULL,                     -- links this conversation to a lead (the person)
//     state TEXT DEFAULT 'awaiting_name',        -- where the bot is in the conversation flow (state machine)
//     last_message_at TEXT DEFAULT (datetime('now')), -- when the last message in this convo was received
//     FOREIGN KEY (lead_id) REFERENCES leads(id) -- enforces that lead_id must exist in the leads table
//   );

//   CREATE TABLE IF NOT EXISTS messages (
//     id INTEGER PRIMARY KEY AUTOINCREMENT, -- auto-incrementing number (SQLite handles this, unlike leads where we use uuid)
//     lead_id TEXT NOT NULL,                -- links this message to a lead
//     direction TEXT NOT NULL,              -- 'inbound' (customer sent it) or 'outbound' (bot sent it)
//     body TEXT,                            -- the clean text of the message (what you display in the dashboard)
//     raw_payload TEXT,                     -- the full JSON from Meta, stringified — your audit trail
//     created_at TEXT DEFAULT (datetime('now')),
//     FOREIGN KEY (lead_id) REFERENCES leads(id) -- every message must belong to a real lead
//   );
// `);

// module.exports = db; // export the db connection so any other file can import it with require('./db')