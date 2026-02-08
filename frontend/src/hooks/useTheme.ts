import { useEffect } from 'react'
import { useThemeStore } from '../store/themeStore'

export function useTheme() {
  const { theme, setTheme, toggleTheme } = useThemeStore()

  useEffect(() => {
    // Ensure theme is applied to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  // Sync with system preference if needed
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set a preference
      const hasPreference = localStorage.getItem('theme-storage')
      if (!hasPreference) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [setTheme])

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark: theme === 'dark',
  }
}
