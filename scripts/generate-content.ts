import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { parse } from 'yaml'
import { ZodError } from 'zod'

import {
  parseApartmentDraft,
  validateApartmentCollection,
} from '../src/data/schema.ts'
import type {
  Apartment,
  ApartmentDraft,
  ApartmentImage,
} from '../src/data/types.ts'

export interface LoadedApartmentDraft {
  directoryName: string
  filePath: string
  draft: ApartmentDraft
}

const defaultRepositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
)

function formatError(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '(root)'
        return `${path}: ${issue.message}`
      })
      .join('\n')
  }

  return error instanceof Error ? error.message : String(error)
}

export async function loadApartmentDrafts(
  repositoryRoot = defaultRepositoryRoot,
): Promise<LoadedApartmentDraft[]> {
  const contentRoot = resolve(repositoryRoot, 'content')
  const entries = await readdir(contentRoot, { withFileTypes: true })
  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))

  const loaded: LoadedApartmentDraft[] = []
  const errors: string[] = []

  for (const directory of directories) {
    const filePath = resolve(contentRoot, directory.name, 'info.yml')

    try {
      const source = await readFile(filePath, 'utf8')
      const draft = parseApartmentDraft(parse(source))

      if (draft.slug !== directory.name) {
        errors.push(
          `${relative(repositoryRoot, filePath)}: slug "${draft.slug}"가 폴더 이름 "${directory.name}"와 다릅니다.`,
        )
      }

      loaded.push({ directoryName: directory.name, filePath, draft })
    } catch (error) {
      errors.push(`${relative(repositoryRoot, filePath)}:\n${formatError(error)}`)
    }
  }

  if (errors.length > 0) {
    throw new Error(`콘텐츠를 읽을 수 없습니다.\n\n${errors.join('\n\n')}`)
  }

  return loaded
}

async function discoverImages(
  repositoryRoot: string,
  draft: ApartmentDraft,
): Promise<ApartmentImage[]> {
  const mediaDirectory = resolve(repositoryRoot, 'public', 'media', draft.slug)
  let names: string[]

  try {
    names = (await readdir(mediaDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return []
    throw error
  }

  const pairs = new Map<string, { thumbnail?: string; full?: string }>()
  for (const name of names) {
    if (!name.endsWith('.webp')) continue

    const match = /^(.*)-(640|1600)\.webp$/.exec(name)
    if (!match) {
      throw new Error(
        `public/media/${draft.slug}/${name}: 파일명은 <id>-640.webp 또는 <id>-1600.webp 형식이어야 합니다.`,
      )
    }

    const [, id, width] = match
    if (!id) continue
    const pair = pairs.get(id) ?? {}
    if (width === '640') pair.thumbnail = name
    if (width === '1600') pair.full = name
    pairs.set(id, pair)
  }

  const images: ApartmentImage[] = []
  for (const [id, pair] of [...pairs].sort(([left], [right]) => left.localeCompare(right))) {
    if (!pair.thumbnail || !pair.full) {
      throw new Error(
        `public/media/${draft.slug}/${id}: 640px와 1600px WebP가 모두 있어야 합니다.`,
      )
    }

    const root = `./media/${draft.slug}`
    images.push({
      id,
      thumbnail: `${root}/${pair.thumbnail}`,
      full: `${root}/${pair.full}`,
      alt: `${draft.name ?? draft.slug} 사진 ${images.length + 1}`,
    })
  }

  return images
}

function assertPublishedFields(draft: ApartmentDraft): asserts draft is ApartmentDraft & {
  published: true
  name: string
  sourceFolder: string
  rank: number
  status: NonNullable<ApartmentDraft['status']>
  location: {
    address: string
    area?: string
    lat: number
    lng: number
  }
} {
  const issues = validateApartmentCollection([draft])
  if (issues.length > 0) throw new Error(issues.join('\n'))
}

export async function buildPublishedApartments(
  loaded: LoadedApartmentDraft[],
  repositoryRoot = defaultRepositoryRoot,
): Promise<Apartment[]> {
  const collectionIssues = validateApartmentCollection(loaded.map(({ draft }) => draft))
  if (collectionIssues.length > 0) {
    throw new Error(`콘텐츠 검증에 실패했습니다.\n- ${collectionIssues.join('\n- ')}`)
  }

  const apartments: Apartment[] = []
  for (const { draft } of loaded) {
    if (!draft.published) continue
    assertPublishedFields(draft)

    const {
      sourceFolder: _sourceFolder,
      sourceSubfolders: _sourceSubfolders,
      mediaSync: _mediaSync,
      ...publicDraft
    } = draft
    apartments.push({
      ...publicDraft,
      published: true,
      name: draft.name,
      rank: draft.rank,
      status: draft.status,
      location: draft.location,
      costs: draft.costs ?? {},
      media: {
        images: draft.mediaSync === false
          ? []
          : await discoverImages(repositoryRoot, draft),
      },
    })
  }

  return apartments.sort(
    (left, right) => left.rank - right.rank || left.name.localeCompare(right.name),
  )
}

export async function generateContent(options?: {
  repositoryRoot?: string
  validateOnly?: boolean
}): Promise<Apartment[]> {
  const repositoryRoot = options?.repositoryRoot ?? defaultRepositoryRoot
  const loaded = await loadApartmentDrafts(repositoryRoot)
  const apartments = await buildPublishedApartments(loaded, repositoryRoot)

  if (!options?.validateOnly) {
    const outputPath = resolve(repositoryRoot, 'src', 'generated', 'apartments.json')
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, `${JSON.stringify(apartments, null, 2)}\n`, 'utf8')
    console.log(`Generated ${apartments.length} published apartment(s).`)
  } else {
    console.log(`Validated ${loaded.length} draft(s), ${apartments.length} published.`)
  }

  return apartments
}

async function main(): Promise<void> {
  const allowedArguments = new Set(['--validate-only'])
  const unexpected = process.argv.slice(2).filter((argument) => !allowedArguments.has(argument))
  if (unexpected.length > 0) {
    throw new Error(`알 수 없는 옵션: ${unexpected.join(', ')}`)
  }

  await generateContent({ validateOnly: process.argv.includes('--validate-only') })
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(formatError(error))
    process.exitCode = 1
  })
}
