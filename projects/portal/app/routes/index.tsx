import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    if (import.meta.env.PROD) throw redirect({ href: 'https://algorand.co/xchain' })
    throw redirect({ to: '/app' })
  },
})
