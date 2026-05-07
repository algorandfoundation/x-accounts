import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { Header } from '~/components/layout/header'
import { Footer } from '~/components/layout/footer'
import { getDocNav } from '~/lib/docs'
import { cn } from '~/lib/utils'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export const Route = createFileRoute('/docs')({
  component: DocsLayout,
  head: () => ({
    meta: [{ title: 'Documentation — xChain EVM' }],
  }),
})

function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const docs = getDocNav()

  return (
    <nav className="space-y-1">
      {docs.map((doc, i) => {
        const showCategory = i === 0 || doc.category !== docs[i - 1].category
        return (
          <div key={doc.slug}>
            {showCategory && (
              <p
                className={cn(
                  'mb-2 mt-4 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                  doc.category !== docs[0].category && '!mt-6',
                )}
              >
                {doc.category}
              </p>
            )}
            <Link
              to="/docs/$slug"
              params={{ slug: doc.slug }}
              className={cn(
                'block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
              )}
              activeProps={{
                className: 'bg-accent text-accent-foreground font-medium',
              }}
              onClick={onNavigate}
            >
              {doc.title}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}

function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      {/* Mobile sidebar toggle */}
      <div className="sticky top-16 z-40 flex h-12 items-center border-b bg-background px-4 lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
          {sidebarOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        {/* Sidebar - desktop: static in flex, mobile: fixed overlay */}
        <aside className={cn('hidden w-64 shrink-0 border-r p-4 pt-6 lg:block')}>
          <DocsSidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div className="fixed inset-0 top-28 z-20 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} />
            <aside className="fixed left-0 top-28 bottom-0 z-30 w-64 overflow-y-auto bg-background p-4 shadow-lg lg:hidden">
              <DocsSidebar onNavigate={() => setSidebarOpen(false)} />
            </aside>
          </>
        )}

        {/* Content */}
        <main className="min-w-0 flex-1 px-4 py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  )
}
