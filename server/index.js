const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Database folder
const dataDirectory = path.join(__dirname, "data");
fs.mkdirSync(dataDirectory, { recursive: true });

// SQLite database
const db = new Database(
  path.join(dataDirectory, "ecotrack.db")
);

db.pragma("journal_mode = WAL");

// Create activities table
db.exec(`
  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    emission REAL NOT NULL,
    activity_date TEXT NOT NULL,
    day TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

// Carbon emission factors
const factors = {
  car: 0.18,
  bus: 0.08,
  motorcycle: 0.1,
  vegetarian: 1.5,
  meat: 3.0,
  electricity: 0.7
};

// Valid activity types
const validTypes = {
  transport: ["car", "bus", "motorcycle"],
  food: ["vegetarian", "meat"],
  energy: ["electricity"]
};

// Home route
app.get("/", (req, res) => {
  res.send("EcoTrack backend is running.");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "EcoTrack backend is running"
  });
});

// Get all activities
app.get("/api/activities", (req, res) => {
  try {
    const activities = db
      .prepare(`
        SELECT
          id,
          category,
          type,
          quantity,
          emission,
          activity_date AS date,
          day
        FROM activities
        ORDER BY id DESC
      `)
      .all();

    res.json(activities);
  } catch (error) {
    console.error("Error fetching activities:", error);

    res.status(500).json({
      error: "Failed to fetch activities"
    });
  }
});

// Add activity
app.post("/api/activities", (req, res) => {
  try {
    const { category, type, quantity } = req.body;

    if (
      !validTypes[category] ||
      !validTypes[category].includes(type)
    ) {
      return res.status(400).json({
        error: "Invalid activity category or type"
      });
    }

    const parsedQuantity = Number(quantity);

    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0
    ) {
      return res.status(400).json({
        error: "Quantity must be a positive number"
      });
    }

    const emission = parsedQuantity * factors[type];

    const now = new Date();

    const activityDate = now.toLocaleDateString();

    const day = now.toLocaleDateString("en-US", {
      weekday: "short"
    });

    const result = db
      .prepare(`
        INSERT INTO activities
        (
          category,
          type,
          quantity,
          emission,
          activity_date,
          day
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        category,
        type,
        parsedQuantity,
        emission,
        activityDate,
        day
      );

    const activity = db
      .prepare(`
        SELECT
          id,
          category,
          type,
          quantity,
          emission,
          activity_date AS date,
          day
        FROM activities
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.status(201).json(activity);
  } catch (error) {
    console.error("Error adding activity:", error);

    res.status(500).json({
      error: "Failed to add activity"
    });
  }
});

// Delete activity
app.delete("/api/activities/:id", (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "Invalid activity ID"
      });
    }

    const result = db
      .prepare("DELETE FROM activities WHERE id = ?")
      .run(id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: "Activity not found"
      });
    }

    res.json({
      message: "Activity deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting activity:", error);

    res.status(500).json({
      error: "Failed to delete activity"
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(
    `EcoTrack API running on http://localhost:${PORT}`
  );
});