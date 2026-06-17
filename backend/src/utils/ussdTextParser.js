/**
 * Parse USSD path text (star-separated selections).
 * Supports 0 = back one step, 00 = main menu.
 */
export const parseUssdPath = (text) => {
  const raw = String(text || '').trim();
  if (!raw) {
    return { parts: [], isMainMenu: true };
  }

  let parts = raw.split('*').map((p) => p.trim()).filter((p) => p !== '');

  if (parts.length === 0) {
    return { parts: [], isMainMenu: true };
  }

  const last = parts[parts.length - 1];
  if (last === '00') {
    return { parts: [], isMainMenu: true };
  }

  if (last === '0' && parts.length > 1) {
    parts = parts.slice(0, -1);
  }

  return { parts, isMainMenu: parts.length === 0 };
};

export const joinPath = (parts) => parts.join('*');

export default { parseUssdPath, joinPath };
