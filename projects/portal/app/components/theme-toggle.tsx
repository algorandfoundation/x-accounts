import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from './theme-provider'
import { Button } from './ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  function cycle() {
    const next = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
  }

  // Resolve what's actually shown
  const isDark =
    mounted &&
    (theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches))

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label="Toggle theme" className="h-9 w-9">
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  )
}
