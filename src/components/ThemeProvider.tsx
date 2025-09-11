'use client'

import { Theme } from "@radix-ui/themes"
import { createContext, useContext, useEffect, useState } from "react"

interface ThemeContextType {
  theme: 'light' | 'dark'
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  isDark: false
})

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Check initial system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setTheme(mediaQuery.matches ? 'dark' : 'light')
    
    // Listen for system theme changes
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light')
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const contextValue = {
    theme,
    isDark: theme === 'dark'
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <Theme appearance={theme} hasBackground={true}>
        {children}
      </Theme>
    </ThemeContext.Provider>
  )
}
