import { Link } from '@tanstack/react-router'

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>Algorand x EVM &mdash; Use your EVM wallet on Algorand</p>
        <nav className="flex gap-6">
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
          <Link to="/docs" className="hover:text-foreground transition-colors">
            Docs
          </Link>
          <a
            href="https://github.com/algorandfoundation/x-accounts"
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
