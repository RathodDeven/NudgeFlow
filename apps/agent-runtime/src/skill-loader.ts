import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

export type LoadedSkill = {
  name: string
  description: string
  body: string
  sourcePath: string
}

const parseSkill = (raw: string): Pick<LoadedSkill, 'name' | 'description' | 'body'> => {
  if (!raw.startsWith('---')) {
    return { name: 'unknown', description: '', body: raw.trim() }
  }

  const parts = raw.split('---')
  const frontmatter = parts[1] ?? ''
  const body = parts.slice(2).join('---').trim()

  const lines = frontmatter
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const nameLine = lines.find(line => line.startsWith('name:'))
  const descriptionLine = lines.find(line => line.startsWith('description:'))

  return {
    name: nameLine ? nameLine.replace('name:', '').trim() : 'unknown',
    description: descriptionLine ? descriptionLine.replace('description:', '').trim() : '',
    body
  }
}

export const loadSkills = (skillsRoot: string): Record<string, LoadedSkill> => {
  const absolute = path.isAbsolute(skillsRoot) ? skillsRoot : path.resolve(process.cwd(), skillsRoot)
  if (!existsSync(absolute)) {
    return {}
  }

  const result: Record<string, LoadedSkill> = {}
  const dirs = readdirSync(absolute, { withFileTypes: true }).filter(entry => entry.isDirectory())

  for (const dir of dirs) {
    const skillPath = path.join(absolute, dir.name, 'SKILL.md')
    if (!existsSync(skillPath)) {
      continue
    }

    const raw = readFileSync(skillPath, 'utf8')
    const parsed = parseSkill(raw)
    result[dir.name] = {
      ...parsed,
      sourcePath: skillPath
    }
  }

  return result
}
