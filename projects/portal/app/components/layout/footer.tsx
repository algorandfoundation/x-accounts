import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-end">
        <nav className="flex gap-6">
          <Link to="/docs" className="hover:text-foreground transition-colors inline md:hidden">
            Docs
          </Link>
          <Link to="/docs" className="hover:text-foreground transition-colors hidden md:inline">
            Documentation
          </Link>
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <a
            href="https://algorand.co/algorand-foundation/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="https://github.com/algorandfoundation/xchain-accounts"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  )
}
