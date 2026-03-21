/**
 * Utility functions for managing localStorage
 */

/**
 * Clears user data from persisted Redux store
 */
export const clearPersistedUserData = () => {
  try {
    const persistKey = 'persist:root';
    const persistedData = localStorage.getItem(persistKey);
    if (persistedData) {
      const parsed = JSON.parse(persistedData);
      // Xóa user data nếu có
      if (parsed.user) {
        delete parsed.user;
        localStorage.setItem(persistKey, JSON.stringify(parsed));
      }
    }
  } catch (error) {
    console.error('Error clearing persisted user data:', error);
  }
};

/**
 * Clears all persisted data
 */
export const clearAllPersistedData = () => {
  try {
    localStorage.removeItem('persist:root');
  } catch (error) {
    console.error('Error clearing all persisted data:', error);
  }
};


