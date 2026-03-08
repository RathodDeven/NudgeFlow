import { promises as fs } from 'node:fs'
import path from 'node:path'

export type KnowledgeDocument = {
  id: string
  sourcePath: string
  title: string
  content: string
}

const allowedExtensions = new Set(['.md', '.json', '.txt'])

const walk = async (dir: string, acc: string[] = []): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(fullPath, acc)
    } else if (allowedExtensions.has(path.extname(entry.name))) {
      acc.push(fullPath)
    }
  }
  return acc
}

export const loadKnowledgeSet = async (knowledgePath: string): Promise<KnowledgeDocument[]> => {
  const files = await walk(knowledgePath)
  const docs: KnowledgeDocument[] = []
  for (const file of files) {
    const content = await fs.readFile(file, 'utf8')
    docs.push({
      id: path.basename(file),
      sourcePath: file,
      title: path.basename(file).replace(path.extname(file), ''),
      content
    })
  }
  return docs
}

export const queryKnowledge = (
  docs: KnowledgeDocument[],
  query: string,
  maxResults = 3
): KnowledgeDocument[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return docs
    .map(doc => {
      const haystack = `${doc.title} ${doc.content}`.toLowerCase()
      const score = terms.reduce((acc, term) => (haystack.includes(term) ? acc + 1 : acc), 0)
      return { doc, score }
    })
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(entry => entry.doc)
}
