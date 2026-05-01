// ─── SHARED SECURITY UTILITIES ──────────────────────────────────────────────
// Used across all serverless functions for consistent auth & header handling.

const crypto = require("crypto");

const ANALYTICS_PASSWORD = process.env.ANALYTICS_PASSWORD;

const ALLOWED_ORIGINS = [
  "https://clavex-ai.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
];

/**
 * Timing-safe password comparison.
 * Returns true only if the provided password matches ANALYTICS_PASSWORD.
 * Fails closed — if ANALYTICS_PASSWORD is not set, always returns false.
 */
function verifyPassword(provided) {
  if (!ANALYTICS_PASSWORD || !provided || typeof provided !== "string") {
    return false;
  }

  // Normalize to buffers of equal length for timing-safe compare
  const expected = Buffer.from(ANALYTICS_PASSWORD, "utf-8");
  const actual = Buffer.from(provided, "utf-8");

  if (expected.length !== actual.length) {
    // Still do a compare to avoid timing leak on length difference
    crypto.timingSafeEqual(expected, Buffer.alloc(expected.length));
    return false;
  }

  return crypto.timingSafeEqual(expected, actual);
}

/**
 * Extract password from the Authorization header.
 * Expects: Authorization: Bearer <password>
 */
function getPasswordFromHeader(req) {
  const authHeader = req.headers["authorization"] || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Set standard security response headers on a Vercel serverless response.
 */
function setSecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
}

/**
 * Set CORS headers restricted to allowed origins.
 */
function setCorsHeaders(req, res, methods = "GET, POST, OPTIONS") {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

/**
 * HTML-escape a string to prevent XSS in server-rendered HTML.
 */
function escapeHtml(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Simple in-memory brute-force rate limiter for auth endpoints.
 * Tracks failed attempts per IP. Blocks after MAX_ATTEMPTS within WINDOW_MS.
 */
const authAttempts = new Map();
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_ATTEMPTS = 5;

function checkAuthRateLimit(ip) {
  const now = Date.now();
  if (!authAttempts.has(ip)) authAttempts.set(ip, { attempts: [], blocked: 0 });
  const data = authAttempts.get(ip);

  // Clean old attempts
  data.attempts = data.attempts.filter((t) => now - t < AUTH_WINDOW_MS);

  if (data.attempts.length >= AUTH_MAX_ATTEMPTS) {
    return { blocked: true };
  }
  return { blocked: false };
}

function recordAuthFailure(ip) {
  const now = Date.now();
  if (!authAttempts.has(ip)) authAttempts.set(ip, { attempts: [] });
  authAttempts.get(ip).attempts.push(now);
}

// Clean up periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of authAttempts) {
    data.attempts = data.attempts.filter((t) => now - t < AUTH_WINDOW_MS);
    if (data.attempts.length === 0) authAttempts.delete(ip);
  }
}, 10 * 60 * 1000);

module.exports = {
  verifyPassword,
  getPasswordFromHeader,
  setSecurityHeaders,
  setCorsHeaders,
  escapeHtml,
  checkAuthRateLimit,
  recordAuthFailure,
  ALLOWED_ORIGINS,
};
