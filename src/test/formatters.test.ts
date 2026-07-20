import { describe, expect, it } from 'vitest'

import type { Apartment } from '../data/apartments'
import {
  commuteModeLabel,
  formatDate,
  formatMoney,
  monthlyTotal,
  statusLabel,
  unitLabel,
} from '../components/formatters'

function apartmentFixture(overrides: Partial<Apartment> = {}): Apartment {
  return {
    published: true,
    slug: 'test-home',
    name: 'Test Home',
    rank: 1,
    status: 'visited',
    location: {
      address: '1 Test Street',
      area: 'San Mateo',
      lat: 37.56,
      lng: -122.31,
    },
    costs: {
      rent: 3_500,
      recurringFees: 125,
      parking: 100,
      utilitiesEstimate: 175,
    },
    commutes: [],
    amenities: [],
    pros: [],
    cons: [],
    scores: {},
    links: {},
    media: { images: [] },
    ...overrides,
  } as Apartment
}

describe('display formatters', () => {
  it('formats valid money and leaves unknown prices explicit', () => {
    expect(formatMoney(3_900)).toBe('$3,900')
    expect(formatMoney(undefined)).toBe('미정')
  })

  it('calculates a monthly estimate from every recurring cost', () => {
    expect(monthlyTotal(apartmentFixture())).toBe(3_900)
    expect(
      monthlyTotal(
        apartmentFixture({
          costs: {
            rent: 3_500,
            recurringFees: undefined,
            parking: undefined,
            utilitiesEstimate: 175,
          },
        }),
      ),
    ).toBe(3_675)
    expect(monthlyTotal(apartmentFixture({ costs: {} }))).toBeUndefined()
  })

  it('builds readable unit and status labels with safe fallbacks', () => {
    expect(
      unitLabel(
        apartmentFixture({
          unit: { beds: 2, baths: 2, sqft: 1_080 },
        }),
      ),
    ).toBe('2 bed · 2 bath · 1,080 ft²')
    expect(unitLabel(apartmentFixture({ unit: undefined }))).toBe('유닛 정보 확인 중')
    expect(statusLabel('shortlisted')).toBe('최종 후보')
    expect(statusLabel('custom')).toBe('custom')
    expect(commuteModeLabel('driving')).toBe('차량')
    expect(commuteModeLabel()).toBe('예상')
  })

  it('keeps invalid date input visible instead of crashing', () => {
    expect(formatDate()).toBeNull()
    expect(formatDate('not-a-date')).toBe('not-a-date')
  })
})
