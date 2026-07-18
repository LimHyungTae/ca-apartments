import { createHash } from 'node:crypto'
import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
} from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { validateApartmentCollection } from '../src/data/schema.ts'
import type { ApartmentDraft } from '../src/data/types.ts'
import { loadApartmentDrafts } from './generate-content.ts'

interface MediaConfig {
  sourceRoot: string
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const supportedImageExtensions = new Set([
  '.avif',
  '.heic',
  '.heif',
  '.jpeg',
  '.jpg',
  '.png',
  '.tif',
  '.tiff',
  '.webp',
])

function parseConfig(input: unknown): MediaConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('media.config.local.json은 JSON 객체여야 합니다.')
  }

  const entries = Object.entries(input)
  const unexpected = entries.map(([key]) => key).filter((key) => key !== 'sourceRoot')
  if (unexpected.length > 0) {
    throw new Error(`지원하지 않는 설정 키: ${unexpected.join(', ')}`)
  }

  const sourceRoot = (input as Record<string, unknown>).sourceRoot
  if (typeof sourceRoot !== 'string' || sourceRoot.trim() === '') {
    throw new Error('sourceRoot에 Dropbox 원본 폴더의 절대 경로를 입력하세요.')
  }
  if (!isAbsolute(sourceRoot)) {
    throw new Error('sourceRoot는 절대 경로여야 합니다.')
  }

  return { sourceRoot: resolve(sourceRoot) }
}

async function readConfig(): Promise<MediaConfig> {
  const configPath = resolve(repositoryRoot, 'media.config.local.json')
  let source: string

  try {
    source = await readFile(configPath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        'media.config.local.json이 없습니다. media.config.example.json을 복사한 뒤 sourceRoot를 수정하세요.',
      )
    }
    throw error
  }

  try {
    return parseConfig(JSON.parse(source) as unknown)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`media.config.local.json JSON 문법 오류: ${error.message}`)
    }
    throw error
  }
}

async function findImages(directory: string): Promise<string[]> {
  const found: string[] = []

  async function walk(current: string): Promise<void> {
    const entries = (await readdir(current, { withFileTypes: true })).sort((left, right) =>
      left.name.localeCompare(right.name),
    )

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const path = resolve(current, entry.name)
      if (entry.isDirectory()) {
        await walk(path)
      } else if (
        entry.isFile() &&
        supportedImageExtensions.has(extname(entry.name).toLowerCase())
      ) {
        found.push(path)
      }
    }
  }

  await walk(directory)
  return found
}

function outputId(sourceFile: string, sourceDirectory: string): string {
  const relativePath = relative(sourceDirectory, sourceFile).replaceAll('\\', '/')
  const stem = basename(sourceFile, extname(sourceFile))
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  const hash = createHash('sha256').update(relativePath).digest('hex').slice(0, 8)
  return `${stem || 'photo'}-${hash}`
}

async function writePreview(source: string, output: string, width: number): Promise<void> {
  await sharp(source)
    .rotate()
    .resize({ width, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(output)
}

async function syncApartment(
  config: MediaConfig,
  apartment: ApartmentDraft & { sourceFolder: string },
): Promise<number> {
  const sourceDirectory = resolve(config.sourceRoot, apartment.sourceFolder)
  await access(sourceDirectory)

  const images = await findImages(sourceDirectory)
  const outputDirectory = resolve(repositoryRoot, 'public', 'media', apartment.slug)
  await mkdir(outputDirectory, { recursive: true })

  const expectedNames = new Set<string>()
  for (const image of images) {
    const id = outputId(image, sourceDirectory)
    const thumbnailName = `${id}-640.webp`
    const fullName = `${id}-1600.webp`
    expectedNames.add(thumbnailName)
    expectedNames.add(fullName)

    try {
      await writePreview(image, resolve(outputDirectory, thumbnailName), 640)
      await writePreview(image, resolve(outputDirectory, fullName), 1600)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`${relative(repositoryRoot, image)} 변환 실패: ${message}`)
    }
  }

  const existing = await readdir(outputDirectory, { withFileTypes: true })
  for (const entry of existing) {
    if (
      entry.isFile() &&
      entry.name.endsWith('.webp') &&
      !expectedNames.has(entry.name)
    ) {
      await unlink(resolve(outputDirectory, entry.name))
    }
  }

  return images.length
}

async function main(): Promise<void> {
  const config = await readConfig()
  await access(config.sourceRoot)

  const loaded = await loadApartmentDrafts(repositoryRoot)
  const issues = validateApartmentCollection(loaded.map(({ draft }) => draft))
  if (issues.length > 0) {
    throw new Error(`콘텐츠 검증에 실패했습니다.\n- ${issues.join('\n- ')}`)
  }

  const published = loaded.map(({ draft }) => draft).filter((draft) => draft.published)
  if (published.length === 0) {
    console.log('Published 후보가 없어 변환할 미디어가 없습니다.')
    return
  }

  let total = 0
  for (const apartment of published) {
    if (!apartment.sourceFolder) {
      throw new Error(`${apartment.slug}: sourceFolder가 필요합니다.`)
    }
    const count = await syncApartment(
      config,
      apartment as ApartmentDraft & { sourceFolder: string },
    )
    total += count
    console.log(`${apartment.slug}: ${count}개 사진 변환 완료`)
  }

  console.log(`총 ${total}개 사진의 640px/1600px WebP 미리보기를 만들었습니다.`)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
