// ─── IN-MEMORY RATE LIMITER ─────────────────────────────────────────────────
// No external dependencies. Tracks requests per IP in a sliding window.
// Automatically cleans up expired entries to prevent memory leaks.

const store = new Map();

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_REQUESTS = 15;          // max messages per window
const CLEANUP_INTERVAL = 10 * 60 * 1000; // clean old entries every 10 min

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of store) {
    data.timestamps = data.timestamps.filter(t => now - t < WINDOW_MS);
    if (data.timestamps.length === 0) store.delete(ip);
  }
}, CLEANUP_INTERVAL);

/**
 * Express middleware for rate limiting.
 * Returns 429 if the IP exceeds MAX_REQUESTS in WINDOW_MS.
 */
function rateLimiter(req, res, next) {
  const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();

  if (!store.has(ip)) {
    store.set(ip, { timestamps: [] });
  }

  const data = store.get(ip);

  // Remove timestamps outside the current window
  data.timestamps = data.timestamps.filter(t => now - t < WINDOW_MS);

  if (data.timestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = Math.min(...data.timestamps);
    const retryAfterMs = WINDOW_MS - (now - oldestInWindow);
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return res.status(429).json({
      error: "Too many requests",
      message: `You've sent too many messages. Please wait ${retryAfterSec} seconds and try again.`,
      retryAfter: retryAfterSec,
    });
  }

  data.timestamps.push(now);
  next();
}

module.exports = { rateLimiter };
