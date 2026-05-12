import { createFileRoute, Navigate } from "@tanstack/react-router"
import { getDocs } from "~/lib/docs"

export const Route = createFileRoute("/docs/")({
  component: DocsIndex,
})

function DocsIndex() {
  const docs = getDocs()
  if (docs.length > 0) {
    return <Navigate to="/docs/$slug" params={{ slug: docs[0].meta.slug }} />
  }
  return <div className="text-center text-muted-foreground py-12">No documentation available yet.</div>
}
