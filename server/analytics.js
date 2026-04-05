// ─── FILE-BASED ANALYTICS SYSTEM ────────────────────────────────────────────
// Zero external dependencies. Logs events to a JSON file.
// Uses async I/O to avoid blocking the event loop under load.
// Write queue prevents concurrent write corruption.

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const LOG_FILE = path.join(DATA_DIR, "analytics.json");

// Valid event types
const VALID_EVENTS = [
  "page_view",
  "chat_started",
  "message_sent",
  "diagnosis_complete",
  "whatsapp_clicked",
  "linkedin_clicked",
  "export_clicked",
  "service_diagnosed",
  "session_restored",
  "faq_used",
  "privacy_accepted",
];

// Write queue to serialize file operations
let writeQueue = Promise.resolve();

/**
 * Ensure the data directory and log file exist (async).
 */
async function ensureDataFile() {
  try {
    await fsp.access(DATA_DIR);
  } catch {
    await fsp.mkdir(DATA_DIR, { recursive: true });
  }
  try {
    await fsp.access(LOG_FILE);
  } catch {
    await fsp.writeFile(LOG_FILE, "[]", "utf-8");
  }
}

/**
 * Log an analytics event (async, queued writes).
 */
function logEvent(event) {
  // Validate synchronously for fast response
  if (!event.type || !VALID_EVENTS.includes(event.type)) {
    return { success: false, error: "Invalid event type" };
  }

  const entry = {
    type: event.type,
    data: event.data || {},
    timestamp: new Date().toISOString(),
    date: new Date().toISOString().split("T")[0],
  };

  // Queue the write so concurrent calls don't corrupt the file
  writeQueue = writeQueue.then(async () => {
    try {
      await ensureDataFile();

      let logs = [];
      try {
        const raw = await fsp.readFile(LOG_FILE, "utf-8");
        logs = JSON.parse(raw);
      } catch {
        logs = [];
      }

      logs.push(entry);

      // Keep only last 10,000 events to prevent unbounded growth
      if (logs.length > 10000) {
        logs = logs.slice(-10000);
      }

      await fsp.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
    } catch (err) {
      console.error("[Analytics] Error logging event:", err.message);
    }
  });

  // Return immediately — don't block the request
  return { success: true };
}

/**
 * Get aggregated analytics stats (async).
 */
async function getStats() {
  try {
    await ensureDataFile();

    const raw = await fsp.readFile(LOG_FILE, "utf-8");
    const logs = JSON.parse(raw);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const todayLogs = logs.filter(l => l.date === today);
    const weekLogs = logs.filter(l => l.date >= sevenDaysAgo);
    const monthLogs = logs.filter(l => l.date >= thirtyDaysAgo);

    const countByType = (arr) => {
      const counts = {};
      for (const entry of arr) {
        counts[entry.type] = (counts[entry.type] || 0) + 1;
      }
      return counts;
    };

    // Service distribution
    const serviceLogs = logs.filter(l => l.type === "service_diagnosed" && l.data?.service);
    const serviceDistribution = {};
    for (const entry of serviceLogs) {
      const s = entry.data.service;
      serviceDistribution[s] = (serviceDistribution[s] || 0) + 1;
    }

    // Conversion funnel
    const funnel = {
      page_views: logs.filter(l => l.type === "page_view").length,
      chats_started: logs.filter(l => l.type === "chat_started").length,
      messages_sent: logs.filter(l => l.type === "message_sent").length,
      diagnoses_complete: logs.filter(l => l.type === "diagnosis_complete").length,
      whatsapp_clicks: logs.filter(l => l.type === "whatsapp_clicked").length,
    };

    // Daily breakdown (last 7 days)
    const dailyBreakdown = {};
    for (const entry of weekLogs) {
      if (!dailyBreakdown[entry.date]) dailyBreakdown[entry.date] = {};
      dailyBreakdown[entry.date][entry.type] = (dailyBreakdown[entry.date][entry.type] || 0) + 1;
    }

    return {
      overview: {
        totalEvents: logs.length,
        today: countByType(todayLogs),
        last7Days: countByType(weekLogs),
        last30Days: countByType(monthLogs),
      },
      funnel,
      serviceDistribution,
      dailyBreakdown,
      generatedAt: now.toISOString(),
    };
  } catch (err) {
    console.error("[Analytics] Error getting stats:", err.message);
    return { error: err.message };
  }
}

module.exports = { logEvent, getStats, VALID_EVENTS };
