// Utility to reset theme to light mode
export const resetThemeToLight = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('darkMode', 'false');
    document.documentElement.classList.remove('dark');
    // Force a page reload to ensure all components update
    window.location.reload();
  }
};

// Utility to check current theme
export const getCurrentTheme = () => {
  if (typeof window !== 'undefined') {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  }
  return 'light';
};

