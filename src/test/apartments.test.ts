import { describe, expect, it } from 'vitest'

import {
  calculateMonthlyTotal,
  getTopApartments,
  type Apartment,
} from '../data/apartments'
import { parseApartmentDraft, validateApartmentCollection } from '../data/schema'
import type { ApartmentDraft } from '../data/types'

function apartmentFixture(rank: number, name: string): Apartment {
  return {
    published: true,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    name,
    rank,
    status: 'visited',
    location: {
      address: `${rank} Test Street`,
      area: 'San Mateo',
      lat: 37.56 + rank / 1_000,
      lng: -122.31,
    },
    costs: { rent: 3_500 + rank },
    media: { images: [] },
  }
}

function publishedDraft(overrides: Partial<ApartmentDraft> = {}): ApartmentDraft {
  return {
    published: true,
    slug: 'alpha-home',
    name: 'Alpha Home',
    sourceFolder: 'Alpha Home',
    rank: 1,
    status: 'visited',
    location: {
      address: '1 Test Street',
      lat: 37.56,
      lng: -122.31,
    },
    costs: { rent: 3_500 },
    ...overrides,
  }
}

describe('apartment helpers', () => {
  it('adds only monthly costs to the estimated total', () => {
    expect(
      calculateMonthlyTotal({
        rent: 3_500,
        recurringFees: 125,
        parking: 100,
        utilitiesEstimate: 175,
        deposit: 2_000,
      }),
    ).toBe(3_900)
    expect(calculateMonthlyTotal({ rent: 3_500 })).toBe(3_500)
  })

  it('returns ranked Top 3 data without mutating the source list', () => {
    const source = [
      apartmentFixture(3, 'Charlie Home'),
      apartmentFixture(1, 'Alpha Home'),
      apartmentFixture(2, 'Bravo Home'),
      apartmentFixture(4, 'Delta Home'),
    ]

    expect(getTopApartments(source).map((item) => item.rank)).toEqual([1, 2, 3])
    expect(source.map((item) => item.rank)).toEqual([3, 1, 2, 4])
    expect(getTopApartments(source, 0)).toEqual([])
    expect(() => getTopApartments(source, -1)).toThrow(RangeError)
  })
})

describe('content validation', () => {
  it('normalizes blank template fields while preserving valid draft data', () => {
    expect(
      parseApartmentDraft({
        published: false,
        slug: 'park-place',
        name: '   ',
        sourceFolder: null,
        costs: { rent: null, promotion: '' },
        amenities: ['', 'Pool'],
        surroundings: [' ', 'Quiet street'],
        features: ['', 'In-unit laundry'],
      }),
    ).toEqual({
      published: false,
      slug: 'park-place',
      costs: {},
      amenities: ['Pool'],
      surroundings: ['Quiet street'],
      features: ['In-unit laundry'],
    })
  })

  it('accepts building, floor, access, surroundings, and feature details', () => {
    const draft = parseApartmentDraft({
      published: false,
      slug: 'detailed-home',
      unit: { floor: 2 },
      building: {
        propertyType: 'apartment',
        yearBuilt: 1988,
        totalFloors: 3,
      },
      access: {
        entryStairs: true,
        internalStairs: false,
        elevator: false,
        stepFreeEntry: false,
        notes: 'Parking is one flight below the entrance',
      },
      surroundings: ['Quiet street', 'Five minutes to groceries'],
      features: ['South-facing living room', 'In-unit laundry'],
    })

    expect(draft.unit?.floor).toBe(2)
    expect(draft.building).toEqual({
      propertyType: 'apartment',
      yearBuilt: 1988,
      totalFloors: 3,
    })
    expect(draft.access?.entryStairs).toBe(true)
    expect(draft.surroundings).toEqual(['Quiet street', 'Five minutes to groceries'])
    expect(draft.features).toEqual(['South-facing living room', 'In-unit laundry'])
  })

  it.each([
    { unit: { floor: 0 } },
    { building: { propertyType: 'duplex' } },
    { building: { yearBuilt: 1799 } },
    { building: { yearBuilt: new Date().getUTCFullYear() + 2 } },
    { building: { totalFloors: 0 } },
    { access: { elevator: 'unknown' } },
  ])('rejects invalid building or access details: %j', (details) => {
    expect(() =>
      parseApartmentDraft({
        published: false,
        slug: 'invalid-details',
        ...details,
      }),
    ).toThrow()
  })

  it('rejects a unit floor above the building total', () => {
    expect(() =>
      parseApartmentDraft({
        published: false,
        slug: 'impossible-floor',
        unit: { floor: 4 },
        building: { totalFloors: 3 },
      }),
    ).toThrow(/전체 층수/)
  })

  it('rejects invalid identifiers, dates, coordinates, and links', () => {
    expect(() =>
      parseApartmentDraft({
        published: false,
        slug: 'Not Valid',
        visitDate: '2026-02-30',
        location: { lat: 91, lng: -122.31 },
        links: { dropboxFolder: 'not-a-url' },
      }),
    ).toThrow()
  })

  it('allows only http or https external links', () => {
    expect(() =>
      parseApartmentDraft({
        published: false,
        slug: 'unsafe-link',
        links: { listing: 'javascript:alert(1)' },
      }),
    ).toThrow(/http/)

    expect(
      parseApartmentDraft({
        published: false,
        slug: 'safe-link',
        links: { listing: 'https://example.com/listing' },
      }).links?.listing,
    ).toBe('https://example.com/listing')
  })

  it('reports missing publication fields and duplicate public ranks and slugs', () => {
    const issues = validateApartmentCollection([
      publishedDraft(),
      publishedDraft({ slug: 'bravo-home', name: 'Bravo Home', sourceFolder: 'Bravo Home' }),
      { published: false, slug: 'alpha-home' },
      { published: true, slug: 'incomplete-home' },
    ])

    expect(issues).toContain('rank 1 중복: alpha-home, bravo-home')
    expect(issues).toContain('slug 중복: alpha-home')
    expect(issues.find((issue) => issue.startsWith('incomplete-home:'))).toContain('costs.rent')
  })
})
