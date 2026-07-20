import { z } from 'zod'

import {
  apartmentStatuses,
  commuteModes,
  propertyTypes,
  type ApartmentDraft,
} from './types'

const maximumBuildingYear = new Date().getUTCFullYear() + 1

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD 형식이어야 합니다.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
  }, '실제로 존재하는 날짜여야 합니다.')

const optionalText = z.string().trim().min(1).optional()
const money = z.number().finite().nonnegative()
const score = z.number().finite().min(0).max(10)
const optionalHttpUrl = z
  .url()
  .refine((value) => {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  }, 'http 또는 https 주소여야 합니다.')
  .optional()

const locationSchema = z
  .object({
    address: optionalText,
    area: optionalText,
    lat: z.number().finite().min(-90).max(90).optional(),
    lng: z.number().finite().min(-180).max(180).optional(),
  })
  .strict()

const unitSchema = z
  .object({
    number: optionalText,
    beds: z.number().finite().nonnegative().optional(),
    baths: z.number().finite().nonnegative().optional(),
    sqft: z.number().int().positive().optional(),
    floor: z.number().int().positive().optional(),
    availableDate: isoDate.optional(),
  })
  .strict()

const buildingSchema = z
  .object({
    propertyType: z.enum(propertyTypes).optional(),
    yearBuilt: z.number().int().min(1800).max(maximumBuildingYear).optional(),
    totalFloors: z.number().int().positive().optional(),
  })
  .strict()

const accessSchema = z
  .object({
    entryStairs: z.boolean().optional(),
    internalStairs: z.boolean().optional(),
    elevator: z.boolean().optional(),
    stepFreeEntry: z.boolean().optional(),
    notes: optionalText,
  })
  .strict()

const leaseSchema = z
  .object({
    termMonths: z.number().int().positive().optional(),
    notes: optionalText,
  })
  .strict()

const parkingSchema = z
  .object({
    type: optionalText,
    spaces: z.number().int().nonnegative().optional(),
    notes: optionalText,
  })
  .strict()

const costsSchema = z
  .object({
    rent: money.optional(),
    recurringFees: money.optional(),
    parking: money.optional(),
    utilitiesEstimate: money.optional(),
    deposit: money.optional(),
    promotion: optionalText,
  })
  .strict()

const commuteSchema = z
  .object({
    label: z.string().trim().min(1),
    minutes: z.number().int().nonnegative(),
    mode: z.enum(commuteModes).optional(),
  })
  .strict()

const scoresSchema = z
  .object({
    location: score.optional(),
    value: score.optional(),
    unit: score.optional(),
    amenities: score.optional(),
    commute: score.optional(),
    overall: score.optional(),
  })
  .strict()

const linksSchema = z
  .object({
    official: optionalHttpUrl,
    listing: optionalHttpUrl,
    dropboxFolder: optionalHttpUrl,
  })
  .strict()

export const apartmentDraftSchema = z
  .object({
    published: z.boolean(),
    slug: z
      .string()
      .trim()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, '소문자 kebab-case여야 합니다.'),
    name: optionalText,
    sourceFolder: z
      .string()
      .trim()
      .min(1)
      .refine(
        (value) =>
          !value.includes('/') &&
          !value.includes('\\') &&
          value !== '.' &&
          value !== '..',
        'Dropbox 루트 바로 아래의 폴더 이름만 입력하세요.',
      )
      .optional(),
    sourceSubfolders: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .refine(
            (value) =>
              !value.includes('/') &&
              !value.includes('\\') &&
              !value.includes('\0') &&
              value !== '.' &&
              value !== '..',
            'sourceFolder 바로 아래의 한 단계 폴더 이름만 입력하세요.',
          ),
      )
      .min(1, '사진 하위 폴더를 하나 이상 입력하세요.')
      .refine(
        (values) => new Set(values).size === values.length,
        '사진 하위 폴더 이름은 중복될 수 없습니다.',
      )
      .optional(),
    mediaSync: z.boolean().optional(),
    rank: z.number().int().positive().optional(),
    status: z.enum(apartmentStatuses).optional(),
    location: locationSchema.optional(),
    visitDate: isoDate.optional(),
    unit: unitSchema.optional(),
    building: buildingSchema.optional(),
    access: accessSchema.optional(),
    lease: leaseSchema.optional(),
    parking: parkingSchema.optional(),
    costs: costsSchema.optional(),
    commutes: z.array(commuteSchema).optional(),
    amenities: z.array(z.string().trim().min(1)).optional(),
    surroundings: z.array(z.string().trim().min(1)).optional(),
    features: z.array(z.string().trim().min(1)).optional(),
    pros: z.array(z.string().trim().min(1)).optional(),
    cons: z.array(z.string().trim().min(1)).optional(),
    notes: optionalText,
    scores: scoresSchema.optional(),
    links: linksSchema.optional(),
    lastVerified: isoDate.optional(),
  })
  .strict()
  .superRefine((draft, context) => {
    if (
      typeof draft.unit?.floor === 'number'
      && typeof draft.building?.totalFloors === 'number'
      && draft.unit.floor > draft.building.totalFloors
    ) {
      context.addIssue({
        code: 'custom',
        message: '유닛 층수는 건물 전체 층수보다 클 수 없습니다.',
        path: ['unit', 'floor'],
      })
    }
  })

function removeBlankValues(value: unknown): unknown {
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' && value.trim() === '') return undefined

  if (Array.isArray(value)) {
    return value
      .map(removeBlankValues)
      .filter((item): item is Exclude<typeof item, undefined> => item !== undefined)
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, removeBlankValues(item)] as const)
        .filter((entry): entry is [string, unknown] => entry[1] !== undefined),
    )
  }

  return value
}

export function parseApartmentDraft(input: unknown): ApartmentDraft {
  return apartmentDraftSchema.parse(removeBlankValues(input))
}

export function validateApartmentCollection(drafts: ApartmentDraft[]): string[] {
  const issues: string[] = []
  const slugs = new Map<string, number>()
  const publishedRanks = new Map<number, string>()

  for (const draft of drafts) {
    slugs.set(draft.slug, (slugs.get(draft.slug) ?? 0) + 1)

    if (!draft.published) continue

    const missing: string[] = []
    if (!draft.name) missing.push('name')
    if (!draft.sourceFolder) missing.push('sourceFolder')
    if (draft.rank === undefined) missing.push('rank')
    if (!draft.status) missing.push('status')
    if (!draft.location?.address) missing.push('location.address')
    if (draft.location?.lat === undefined) missing.push('location.lat')
    if (draft.location?.lng === undefined) missing.push('location.lng')
    if (missing.length > 0) {
      issues.push(`${draft.slug}: published 후보의 필수 필드 누락: ${missing.join(', ')}`)
    }

    if (draft.rank !== undefined) {
      const existing = publishedRanks.get(draft.rank)
      if (existing) {
        issues.push(`rank ${draft.rank} 중복: ${existing}, ${draft.slug}`)
      } else {
        publishedRanks.set(draft.rank, draft.slug)
      }
    }
  }

  for (const [slug, count] of slugs) {
    if (count > 1) issues.push(`slug 중복: ${slug}`)
  }

  return issues
}
