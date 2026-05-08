// Load all markdown files at build time via Vite's import.meta.glob
const docModules = import.meta.glob<string>("../content/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
})

export interface DocMeta {
  title: string
  description: string
  order: number
  category: string
  slug: string
}

export interface Doc {
  meta: DocMeta
  content: string
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { meta: {}, content: raw }
  const meta: Record<string, string> = {}
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":")
    if (colonIdx > 0) {
      meta[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim()
    }
  }
  return { meta, content: match[2] }
}

function parseDocs(): Doc[] {
  return Object.entries(docModules)
    .map(([path, raw]) => {
      const slug = path.split("/").pop()!.replace(".md", "")
      const { meta, content } = parseFrontmatter(raw)
      return {
        meta: {
          title: meta.title || slug,
          description: meta.description || "",
          order: parseInt(meta.order || "99", 10),
          category: meta.category || "General",
          slug,
        },
        content,
      }
    })
    .sort((a, b) => a.meta.order - b.meta.order)
}

let _docs: Doc[] | null = null

export function getDocs(): Doc[] {
  if (!_docs) _docs = parseDocs()
  return _docs
}

export function getDocBySlug(slug: string): Doc | undefined {
  return getDocs().find((d) => d.meta.slug === slug)
}

export function getDocNav(): DocMeta[] {
  return getDocs().map((d) => d.meta)
}
