// ─── INPUT VALIDATION & PROMPT INJECTION PROTECTION ─────────────────────────

const MAX_MESSAGE_LENGTH = 800;

/**
 * Normalize a string to strip Unicode tricks used to bypass regex filters.
 * - Converts Cyrillic/Greek homoglyphs to ASCII equivalents
 * - Removes zero-width characters (ZWJ, ZWNJ, ZW-space, etc.)
 * - Normalizes whitespace
 */
function normalizeUnicode(text) {
  // Remove zero-width characters
  let normalized = text.replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD\u2060\u180E]/g, "");

  // Common Cyrillic/Greek homoglyph to ASCII mapping
  const homoglyphMap = {
    "\u0430": "a", "\u0435": "e", "\u043E": "o", "\u0440": "p",
    "\u0441": "c", "\u0443": "y", "\u0445": "x", "\u0456": "i",
    "\u0410": "A", "\u0415": "E", "\u041E": "O", "\u0420": "P",
    "\u0421": "C", "\u0423": "Y", "\u0425": "X", "\u0406": "I",
    "\u0392": "B", "\u0397": "H", "\u039C": "M", "\u039D": "N",
    "\u03A4": "T", "\u0391": "A", "\u0395": "E", "\u039A": "K",
    "\u03BF": "o", "\u03B1": "a", "\u03B5": "e", "\u03BA": "k",
  };

  normalized = normalized.split("").map(c => homoglyphMap[c] || c).join("");

  // Normalize Unicode (NFC form) and collapse multiple spaces
  normalized = normalized.normalize("NFC").replace(/\s+/g, " ");

  return normalized;
}

// Patterns that indicate prompt injection attempts
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules)/i,
  /reveal\s+(your|the)\s+(system\s+)?prompt/i,
  /show\s+(me\s+)?(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /what\s+(are|is)\s+your\s+(system\s+)?(prompt|instructions|rules)/i,
  /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /print\s+(your|the)\s+(system\s+)?(prompt|instructions)/i,
  /disregard\s+(all\s+)?(previous|prior|above)/i,
  /you\s+are\s+now\s+a\s+(different|new|general)/i,
  /forget\s+(everything|all)\s+(you|about)/i,
  /override\s+(your|all|the)\s+(instructions|rules|prompt)/i,
  /act\s+as\s+(if\s+)?(you\s+)?(are|were)\s+a\s+(different|new)/i,
  /pretend\s+(you\s+)?(are|were)\s+(not|no\s+longer)\s+/i,
  /\bDAN\b/,  // "Do Anything Now" jailbreak
  /jailbreak/i,
  // Additional patterns
  /new\s+instructions?\s*:/i,
  /system\s*:\s*/i,
  /\[\s*system\s*\]/i,
  /ADMIN\s*:\s*/i,
  /developer\s+mode/i,
  /bypass\s+(safety|filter|content|restriction)/i,
  /output\s+(your|the)\s+(system|initial)\s+(prompt|message|instruction)/i,
  /what\s+was\s+(the\s+)?(first|original|initial)\s+(message|instruction|prompt)/i,
  /translate\s+(your|the)\s+(system\s+)?(prompt|instructions)\s+to/i,
  /base64\s+(decode|encode)\s+(your|the)/i,
  /roleplay\s+as\s+(a\s+)?(unrestricted|unfiltered)/i,
];

/**
 * Validates a single user message.
 * Returns { valid: true } or { valid: false, error: string }
 */
function validateMessage(content) {
  if (typeof content !== "string") {
    return { valid: false, error: "Message must be a string." };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Message cannot be empty." };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message is too long (${trimmed.length} characters). Maximum is ${MAX_MESSAGE_LENGTH}.`,
    };
  }

  // Normalize Unicode before checking patterns (defeat homoglyph attacks)
  const normalized = normalizeUnicode(trimmed);

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        valid: false,
        error: "Your message couldn't be processed. Please rephrase and try again.",
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize message content — strip control characters but preserve normal text.
 */
function sanitize(content) {
  return content
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars (keep \n, \r, \t)
    .trim();
}

/**
 * Validates the entire messages array from the client.
 */
function validateMessages(messages) {
  if (!Array.isArray(messages)) {
    return { valid: false, error: "Messages must be an array." };
  }

  if (messages.length === 0) {
    return { valid: false, error: "Messages array cannot be empty." };
  }

  if (messages.length > 30) {
    return { valid: false, error: "Conversation is too long. Please start a new session." };
  }

  // Calculate total conversation size to prevent oversized payloads
  let totalSize = 0;

  for (const msg of messages) {
    // Strictly only allow user and assistant roles — no system injection
    if (!msg.role || !["user", "assistant"].includes(msg.role)) {
      return { valid: false, error: "Invalid message format." };
    }
    if (msg.role === "user") {
      const check = validateMessage(msg.content);
      if (!check.valid) return check;
    }
    // Validate assistant messages are strings too
    if (msg.role === "assistant" && typeof msg.content !== "string") {
      return { valid: false, error: "Invalid message format." };
    }

    totalSize += (msg.content || "").length;
  }

  // Total conversation size limit (50KB)
  if (totalSize > 50000) {
    return { valid: false, error: "Conversation data too large. Please start a new session." };
  }

  return { valid: true };
}

module.exports = { validateMessage, validateMessages, sanitize, normalizeUnicode, MAX_MESSAGE_LENGTH };
