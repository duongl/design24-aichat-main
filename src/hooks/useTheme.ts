import { useEffect, useState } from 'react';
import { userProfileService } from '../services/userProfile';

export type ThemeColor = 'default' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>('default');

  useEffect(() => {
    // Load theme from user profile
    const profile = userProfileService.getProfile();
    const theme = profile.preferences?.themeColor || 'default';
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  const applyTheme = (theme: ThemeColor) => {
    // Remove all existing theme classes
    const themeClasses = ['theme-default', 'theme-blue', 'theme-green', 'theme-purple', 'theme-orange', 'theme-red'];
    document.documentElement.classList.remove(...themeClasses);
    
    // Add the new theme class
    document.documentElement.classList.add(`theme-${theme}`);
  };

  const setTheme = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    applyTheme(theme);
    
    // Save to user profile
    userProfileService.updatePreferences({ themeColor: theme });
  };

  return {
    currentTheme,
    setTheme,
    applyTheme
  };
}
