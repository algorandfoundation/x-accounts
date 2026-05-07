import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { ThemeProvider } from '~/components/theme-provider'
import appCss from '~/styles/globals.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'xChain EVM — Use Your EVM Wallet on Algorand' },
      {
        name: 'description',
        content:
          'Connect MetaMask or any EVM wallet to send transactions, manage assets, and bridge tokens on Algorand.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

const themeScript = `(function(){try{var d=document.documentElement;var t=localStorage.getItem('theme')||'system';var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);d.classList.toggle('dark',dark)}catch(e){}})();`

function RootComponent() {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <Outlet />
        </ThemeProvider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-muted-foreground">Page not found</p>
    </div>
  )
}
