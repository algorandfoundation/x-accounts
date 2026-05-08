import { useContext, useSyncExternalStore } from "react"
import { ThemeContext } from "./theme-provider"

export function useTheme() {
  return useContext(ThemeContext)
}

function subscribeMQ(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)")
  mq.addEventListener("change", cb)
  return () => mq.removeEventListener("change", cb)
}

/** Returns the effective 'light' or 'dark' value, resolving 'system' to the actual preference. */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme()
  const systemDark = useSyncExternalStore(
    subscribeMQ,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  )
  return theme === "system" ? (systemDark ? "dark" : "light") : theme
}
