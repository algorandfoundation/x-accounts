import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')

  // Read persisted theme after mount to avoid SSR hydration mismatch
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    if (stored && stored !== 'system') setTheme(stored)
    setMounted(true)
  }, [])

  useEffect(() => {
    const root = document.documentElement

    function apply(t: Theme) {
      if (t === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
      } else {
        root.classList.toggle('dark', t === 'dark')
      }
    }

    apply(theme)
    if (mounted) localStorage.setItem('theme', theme)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme, mounted])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}

/** Returns the effective 'light' or 'dark' value, resolving 'system' to the actual preference. */
export function useResolvedTheme(): 'light' | 'dark' {
  const { theme } = useTheme()
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    if (theme !== 'system') {
      setResolved(theme)
      return
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setResolved(mq.matches ? 'dark' : 'light')
    const handler = (e: MediaQueryListEvent) => setResolved(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return resolved
}
