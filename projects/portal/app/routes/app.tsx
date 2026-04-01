import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Header } from '~/components/layout/header'
import { Footer } from '~/components/layout/footer'

// Lazy-load wallet components to keep them client-only (SSR-safe)
const WalletApp = lazy(() => import('~/components/app/wallet-app'))

export const Route = createFileRoute('/app')({
  component: AppPage,
  head: () => ({
    meta: [{ title: 'App — Algorand x EVM' }],
  }),
})

function AppPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Suspense fallback={
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        }>
          <WalletApp />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
