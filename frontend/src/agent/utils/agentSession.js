// Agent Session Utility
// Manages collection point selection in localStorage for agent interface

export const setAgentCollectionPoint = (point) => {
  try {
    localStorage.setItem('agentCollectionPoint', JSON.stringify(point));
    return true;
  } catch (error) {
    console.error('Error saving collection point to session:', error);
    return false;
  }
};

export const getAgentCollectionPoint = () => {
  try {
    const saved = localStorage.getItem('agentCollectionPoint');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error retrieving collection point from session:', error);
    return null;
  }
};

export const clearAgentCollectionPoint = () => {
  try {
    localStorage.removeItem('agentCollectionPoint');
    return true;
  } catch (error) {
    console.error('Error clearing collection point session:', error);
    return false;
  }
};

export const isAgentSessionActive = () => {
  return getAgentCollectionPoint() !== null;
};
