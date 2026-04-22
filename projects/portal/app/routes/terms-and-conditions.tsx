import { createFileRoute } from '@tanstack/react-router'
import Markdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import { Header } from '~/components/layout/header'
import { Footer } from '~/components/layout/footer'
import termsContent from '~/content/terms-and-conditions.md?raw'

export const Route = createFileRoute('/terms-and-conditions')({
  component: TermsPage,
  head: () => ({
    meta: [{ title: 'Terms & Conditions — Algorand x EVM' }],
  }),
})

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 lg:px-8">
        <article className="prose dark:prose-invert max-w-none">
          <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {termsContent}
          </Markdown>
        </article>
      </main>
      <Footer />
    </div>
  )
}
