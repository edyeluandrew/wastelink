import { getAuthUser } from '../../utils/auth';

const PICKER_SESSION_KEY = 'wastelink_picker_session';

const buildPickerFromAuthUser = (user) => {
  const role = String(user?.role || '').toUpperCase();
  if (!user || role !== 'PICKER') {
    return null;
  }

  if (user.picker && user.picker.id) {
    return user.picker;
  }

  if (!user.picker_id) {
    return null;
  }

  return {
    id: user.picker_id,
    picker_code: user.picker_code || user.picker?.picker_code || null,
    name: user.picker_name || user.name || null,
    phone: user.picker_phone || user.phone || null,
    gender: user.picker_gender || user.gender || null,
    age_group: user.picker_age_group || null,
    division: user.picker_division || user.division || null,
    main_waste_type: user.picker_main_waste_type || null,
    status: user.picker_status || user.status || null,
  };
};

export const getAuthenticatedPicker = () => buildPickerFromAuthUser(getAuthUser());

export const hasAuthenticatedPicker = () => Boolean(getAuthenticatedPicker());

export const setPickerSession = (picker) => {
  if (!picker || !picker.id) {
    return false;
  }

  try {
    localStorage.setItem(PICKER_SESSION_KEY, JSON.stringify(picker));
    return true;
  } catch (err) {
    console.error('[PickerSession] Error setting session:', err);
    return false;
  }
};

export const getPickerSession = () => {
  const authenticatedPicker = getAuthenticatedPicker();
  if (authenticatedPicker) {
    return authenticatedPicker;
  }

  try {
    const session = localStorage.getItem(PICKER_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch (err) {
    console.error('[PickerSession] Error getting session:', err);
    return null;
  }
};

export const getCurrentPicker = () => getPickerSession();

export const getCurrentPickerId = () => getCurrentPicker()?.id || null;

export const clearPickerSession = () => {
  try {
    localStorage.removeItem(PICKER_SESSION_KEY);
    // remove legacy keys that older code paths may have used
    localStorage.removeItem('pickerSession');
    localStorage.removeItem('selectedPicker');
    localStorage.removeItem('selected_picker');
    return true;
  } catch (err) {
    console.error('[PickerSession] Error clearing session:', err);
    return false;
  }
};

export const hasPickerSession = () => Boolean(getPickerSession()?.id);

export const getPickerId = () => getCurrentPickerId();
