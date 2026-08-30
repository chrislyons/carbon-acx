'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
}

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('carbon-acx-theme', newTheme)
    } catch {
      // The document still follows the explicit choice when storage is unavailable.
    }
    document.documentElement.setAttribute('data-theme', newTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((currentTheme) => {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('carbon-acx-theme', newTheme)
      } catch {
        // The document still follows the explicit choice when storage is unavailable.
      }
      document.documentElement.setAttribute('data-theme', newTheme)
      return newTheme
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== '\\'
        || event.altKey
        || event.ctrlKey
        || event.metaKey
        || event.shiftKey
        || event.repeat
        || isTextEntryTarget(event.target)
      ) return
      event.preventDefault()
      toggleTheme()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleTheme])

  useEffect(() => {
    let saved: string | null = null
    try {
      saved = localStorage.getItem('carbon-acx-theme')
    } catch {
      // Use the system preference when persistent storage is unavailable.
    }
    const initialTheme: Theme = saved === 'dark' || saved === 'light'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setThemeState(initialTheme)
    document.documentElement.setAttribute('data-theme', initialTheme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  // During SSR/static generation, context might be undefined
  // Return safe defaults
  if (!context) {
    return {
      theme: 'light',
      toggleTheme: () => {},
      setTheme: () => {},
    }
  }
  return context
}