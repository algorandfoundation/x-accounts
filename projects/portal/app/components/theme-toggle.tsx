import { Moon, Sun } from "lucide-react"
import { useResolvedTheme, useTheme } from "./use-theme"
import { Button } from "./ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const resolvedTheme = useResolvedTheme()

  const isDark = resolvedTheme === "dark"

  function cycle() {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label="Toggle theme" className="h-9 w-9">
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  )
}
