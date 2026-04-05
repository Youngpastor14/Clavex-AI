// ─── INPUT VALIDATION & PROMPT INJECTION PROTECTION ─────────────────────────

const MAX_MESSAGE_LENGTH = 800;

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

  // Check for prompt injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
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

  for (const msg of messages) {
    if (!msg.role || !["user", "assistant"].includes(msg.role)) {
      return { valid: false, error: "Invalid message format." };
    }
    if (msg.role === "user") {
      const check = validateMessage(msg.content);
      if (!check.valid) return check;
    }
  }

  return { valid: true };
}

module.exports = { validateMessage, validateMessages, sanitize, MAX_MESSAGE_LENGTH };
