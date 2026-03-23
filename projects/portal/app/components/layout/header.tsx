import { Link, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { cn } from '~/lib/utils'

const navItems = [{ label: 'Docs', to: '/docs' as const }]

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
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
        {/* Centered status badge - desktop */}
        <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 md:flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
          Private Beta
        </div>
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-primary">Algorand</span>
          <span className="text-[#CCD0D3]">x</span>
          <span style={{ color: '#8a92b2' }}>EVM</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-6 md:flex">
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: 'text-foreground' }}
              >
                {item.label}
              </Link>
            ))}
            <a
              href="https://github.com/algorandfoundation/x-accounts"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              GitHub
            </a>
          </nav>
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

        {/* Mobile toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t p-4 md:hidden">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="block py-2 text-sm font-medium text-muted-foreground"
              activeProps={{ className: 'text-foreground' }}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a
            href="https://github.com/algorandfoundation/x-accounts"
            target="_blank"
            rel="noopener noreferrer"
            className="block py-2 text-sm font-medium text-muted-foreground"
          >
            GitHub
          </a>
          {!isApp && (
            <Link
              to="/app"
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              onClick={() => setMobileOpen(false)}
            >
              Launch
              <ArrowUpRight size={16} />
            </Link>
          )}
          {/* Status badge - mobile */}
          <div className="mt-4 flex justify-center border-t pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Private Beta
            </div>
          </div>
        </nav>
      )}
    </header>
  )
}
