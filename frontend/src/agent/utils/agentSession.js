// Agent Session Utility
// Manages collection point selection in localStorage for agent interface

import apiClient from '../../api/axios';
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from '../../utils/auth';

const LEGACY_AGENT_COLLECTION_POINT_KEY = 'agentCollectionPoint';

const readLegacyCollectionPoint = () => {
  try {
    const saved = localStorage.getItem(LEGACY_AGENT_COLLECTION_POINT_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error retrieving collection point from session:', error);
    return null;
  }
};

const saveLegacyCollectionPoint = (point) => {
  try {
    localStorage.setItem(LEGACY_AGENT_COLLECTION_POINT_KEY, JSON.stringify(point));
    return true;
  } catch (error) {
    console.error('Error saving collection point to session:', error);
    return false;
  }
};

export const setAgentCollectionPoint = (point) => {
  return saveLegacyCollectionPoint(point);
};

export const getAgentCollectionPoint = () => {
  const authUser = getAuthUser();

  if (authUser?.role === 'AGENT' && authUser.collection_point) {
    return authUser.collection_point;
  }

  return readLegacyCollectionPoint();
};

export const clearAgentCollectionPoint = () => {
  try {
    localStorage.removeItem(LEGACY_AGENT_COLLECTION_POINT_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing collection point session:', error);
    return false;
  }
};

export const isAgentSessionActive = () => {
  return getAgentCollectionPoint() !== null;
};

export const hydrateAgentSession = async () => {
  const token = getAuthToken();

  if (!token) {
    return getAuthUser();
  }

  const response = await apiClient.get('/auth/me');
  const user = response.data?.data?.user || null;

  if (user) {
    setAuthSession(token, user);
  }

  return user;
};

export const resolveAgentSession = async () => {
  const legacyCollectionPoint = readLegacyCollectionPoint();
  const authToken = getAuthToken();

  if (authToken) {
    try {
      const user = await hydrateAgentSession();
      const authUser = user || getAuthUser();
      const authCollectionPoint = authUser?.role === 'AGENT' ? authUser.collection_point || null : null;

      return {
        user: authUser,
        collectionPoint: authCollectionPoint || (authUser?.role === 'AGENT' ? legacyCollectionPoint : null),
        source: authCollectionPoint ? 'auth' : legacyCollectionPoint ? 'legacy' : 'auth',
      };
    } catch (error) {
      if (error.response?.status === 401) {
        clearAuthSession();
      }

      const authUser = getAuthUser();
      const authCollectionPoint = authUser?.role === 'AGENT' ? authUser.collection_point || null : null;

      return {
        user: authUser,
        collectionPoint: authCollectionPoint || legacyCollectionPoint,
        source: legacyCollectionPoint ? 'legacy' : 'none',
        error,
      };
    }
  }

  const authUser = getAuthUser();
  const authCollectionPoint = authUser?.role === 'AGENT' ? authUser.collection_point || null : null;

  return {
    user: authUser,
    collectionPoint: authCollectionPoint || legacyCollectionPoint,
    source: authCollectionPoint ? 'auth' : legacyCollectionPoint ? 'legacy' : 'none',
  };
};
