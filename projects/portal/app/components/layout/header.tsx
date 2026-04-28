import { Link, useRouterState } from '@tanstack/react-router'
import { ArrowUpRight, Book, BookOpen } from 'lucide-react'
import { cn } from '~/lib/utils'
import { Logo } from '~/components/logo'
import { ThemeToggle } from '~/components/theme-toggle'
import { Button } from '~/components/ui/button'

const navItems = [{ icon: <BookOpen size="16" />, label: "Docs", to: '/docs' as const }]

export function Header() {
  const routerState = useRouterState()
  const isLanding = routerState.location.pathname === '/'
  const isApp = routerState.location.pathname.startsWith('/app')

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm',
        isLanding && 'border-transparent',
      )}
    >
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        {/* Centered status badge */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 sm:flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Experimental
        </div>
        <Link to="/" aria-label="xChain home" className="flex items-center">
          <Logo className="h-9 w-auto" />
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <Button
                key={item.to}
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label={item.label}
                asChild
              >
                <Link to={item.to}>{item.icon ? item.icon : item.label}</Link>
              </Button>
            ))}
          </nav>
          <ThemeToggle />
          {!isApp && (
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Launch
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
