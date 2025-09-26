'use client'

import { Theme } from "@radix-ui/themes"
import { createContext, useContext } from "react"

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
  const theme: 'light' | 'dark' = 'light'

  const contextValue = {
    theme,
    isDark: false
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      <Theme appearance={theme} hasBackground={true}>
        {children}
      </Theme>
    </ThemeContext.Provider>
  )
}
