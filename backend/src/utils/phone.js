/**
 * Phone number normalization utility for Uganda
 * Normalizes various phone formats to a consistent E.164-like format
 */

/**
 * Normalize Uganda phone number to consistent format
 * Handles: 0700000000, +256700000000, 256700000000
 * Returns: +256700000000
 */
export const normalizePhoneNumber = (phone) => {
  if (!phone) return null;

  // Remove all whitespace
  let normalized = String(phone).trim().replace(/\s+/g, "");

  // Remove any non-digit and non-plus characters
  normalized = normalized.replace(/[^\d+]/g, "");

  // Handle different formats
  if (normalized.startsWith("+256")) {
    // Already in +256 format
    return normalized;
  } else if (normalized.startsWith("256")) {
    // 256700000000 -> +256700000000
    return "+" + normalized;
  } else if (normalized.startsWith("0")) {
    // 0700000000 -> +256700000000
    return "+256" + normalized.substring(1);
  }

  // Fallback: assume it's missing country code
  if (normalized.length === 9) {
    // 700000000 -> +256700000000
    return "+256" + normalized;
  }

  // Return original with + prefix if not already present
  return normalized.startsWith("+") ? normalized : "+" + normalized;
};

/**
 * Get short phone format for display (last 4 digits)
 * +256700123456 -> 0...3456
 */
export const getShortPhoneFormat = (phone) => {
  if (!phone) return "unknown";
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length >= 4) {
    return "0..." + normalized.slice(-4);
  }
  return phone;
};

export default {
  normalizePhoneNumber,
  getShortPhoneFormat,
};
