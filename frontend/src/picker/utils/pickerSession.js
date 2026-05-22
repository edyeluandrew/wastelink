/**
 * Picker Session Management
 * Manages temporary picker session using localStorage.
 * Later, this will be replaced with real authentication.
 */

const PICKER_SESSION_KEY = 'wastelink_picker_session';

/**
 * Set picker session in localStorage
 */
export const setPickerSession = (picker) => {
  if (!picker || !picker.id) {
    console.error('[PickerSession] Invalid picker object');
    return false;
  }
  try {
    localStorage.setItem(PICKER_SESSION_KEY, JSON.stringify(picker));
    console.log('[PickerSession] Session set for picker:', picker.phone);
    return true;
  } catch (err) {
    console.error('[PickerSession] Error setting session:', err);
    return false;
  }
};

/**
 * Get current picker session from localStorage
 */
export const getPickerSession = () => {
  try {
    const session = localStorage.getItem(PICKER_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (err) {
    console.error('[PickerSession] Error getting session:', err);
    return null;
  }
};

/**
 * Clear picker session from localStorage
 */
export const clearPickerSession = () => {
  try {
    localStorage.removeItem(PICKER_SESSION_KEY);
    console.log('[PickerSession] Session cleared');
    return true;
  } catch (err) {
    console.error('[PickerSession] Error clearing session:', err);
    return false;
  }
};

/**
 * Check if picker session exists
 */
export const hasPickerSession = () => {
  const session = getPickerSession();
  return session !== null && session.id !== undefined;
};

/**
 * Get picker ID from session, or null
 */
export const getPickerId = () => {
  const session = getPickerSession();
  return session?.id || null;
};
