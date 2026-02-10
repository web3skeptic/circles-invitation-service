const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

// --- Database setup ---
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const db = new Database(path.join(dataDir, "referrals.db"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key    TEXT    NOT NULL,
    code       TEXT    NOT NULL UNIQUE,
    shown      INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  )
`);

// Index for fast lookup of unused codes per key
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_referrals_key_shown
  ON referrals (api_key, shown)
`);

// --- Prepared statements ---
const stmtGetUnused = db.prepare(
  "SELECT id, code FROM referrals WHERE api_key = ? AND shown = 0 LIMIT 1"
);
const stmtMarkShown = db.prepare(
  "UPDATE referrals SET shown = 1 WHERE id = ?"
);
const stmtInsert = db.prepare(
  "INSERT OR IGNORE INTO referrals (api_key, code, shown, created_at) VALUES (?, ?, 0, ?)"
);
const stmtDelete = db.prepare("DELETE FROM referrals WHERE id = ?");
const stmtListAll = db.prepare(
  "SELECT id, api_key, code, shown, created_at FROM referrals ORDER BY id"
);
const stmtHealth = db.prepare(`
  SELECT
    COALESCE(SUM(shown), 0) AS shown,
    COALESCE(SUM(CASE WHEN shown = 0 THEN 1 ELSE 0 END), 0) AS available
  FROM referrals
`);

// --- Auth middleware ---
function requireAdmin(req, res, next) {
  if (!ADMIN_TOKEN) {
    return res.status(500).json({ error: "ADMIN_TOKEN not configured" });
  }
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- Public routes ---

// Dispense one unused code for the given api_key
app.get("/referral/:api_key", (req, res) => {
  const { api_key } = req.params;
  const row = stmtGetUnused.get(api_key);
  if (!row) {
    return res.status(404).json({ error: "No unused codes for this key" });
  }
  stmtMarkShown.run(row.id);
  res.json({ ref: row.code });
});

// Health check
app.get("/health", (_req, res) => {
  const row = stmtHealth.get();
  res.json({ shown: row.shown, available: row.available });
});

// --- Admin routes ---

// Add codes
app.post("/referral", requireAdmin, (req, res) => {
  const { api_key, codes } = req.body;
  if (!api_key || !Array.isArray(codes) || codes.length === 0) {
    return res.status(400).json({ error: "api_key and codes[] required" });
  }
  const now = new Date().toISOString();
  const insertMany = db.transaction((items) => {
    let added = 0;
    for (const code of items) {
      const info = stmtInsert.run(api_key, code, now);
      if (info.changes > 0) added++;
    }
    return added;
  });
  const added = insertMany(codes);
  res.json({ added });
});

// Delete single code
app.delete("/referral/:id", requireAdmin, (req, res) => {
  stmtDelete.run(req.params.id);
  res.sendStatus(204);
});

// List all codes
app.get("/referrals", requireAdmin, (req, res) => {
  res.json(stmtListAll.all());
});

// --- Static ---
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// --- Start ---
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
