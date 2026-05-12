import { createFileRoute, notFound, Link } from "@tanstack/react-router"
import { getDocBySlug, getDocs } from "~/lib/docs"
import Markdown from "react-markdown"
import rehypeRaw from "rehype-raw"
import remarkGfm from "remark-gfm"

export const Route = createFileRoute("/docs/$slug")({
  loader: ({ params }) => {
    const doc = getDocBySlug(params.slug)
    if (!doc) throw notFound()
    return doc
  },
  component: DocPage,
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.meta.title ?? "Doc"} — xChain EVM Docs` },
      ...(loaderData?.meta.description ? [{ name: "description", content: loaderData.meta.description }] : []),
    ],
  }),
})

function DocPage() {
  const doc = Route.useLoaderData()
  const allDocs = getDocs()
  const currentIndex = allDocs.findIndex((d) => d.meta.slug === doc.meta.slug)
  const prev = currentIndex > 0 ? allDocs[currentIndex - 1] : null
  const next = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null

  return (
    <div>
      <article className="prose dark:prose-invert max-w-none">
        <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {doc.content}
        </Markdown>
      </article>

      {/* Prev/Next navigation */}
      <nav className="mt-12 flex items-center justify-between border-t pt-6">
        {prev ? (
          <Link
            to="/docs/$slug"
            params={{ slug: prev.meta.slug }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {prev.meta.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            to="/docs/$slug"
            params={{ slug: next.meta.slug }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {next.meta.title} &rarr;
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
