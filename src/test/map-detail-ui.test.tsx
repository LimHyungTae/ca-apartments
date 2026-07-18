import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApartmentDetail } from '../components/ApartmentDetail'
import {
  booleanLabel,
  buildingYearLabel,
  buildMarkerPlacements,
  floorLabel,
  mapApartmentLabel,
  mobileMapHorizontalPadding,
  propertyTypeLabel,
} from '../components/formatters'
import type { Apartment } from '../data/apartments'

function apartmentFixture(overrides: Partial<Apartment> = {}): Apartment {
  return {
    published: true,
    slug: 'harbor-home-204',
    name: 'Harbor Home',
    rank: 1,
    status: 'visited',
    location: {
      address: '1 Test Street',
      area: 'Foster City',
      lat: 37.56,
      lng: -122.31,
    },
    unit: { number: '204', beds: 2, baths: 2, sqft: 1_050, floor: 2 },
    building: { propertyType: 'apartment', yearBuilt: 1988, totalFloors: 3 },
    access: {
      entryStairs: false,
      internalStairs: false,
      elevator: true,
      stepFreeEntry: false,
      notes: '주차장에서 현관까지 평지로 이동',
    },
    surroundings: ['산책로가 바로 연결됨'],
    features: ['세탁기·건조기 유닛 내부'],
    pros: ['채광이 좋음'],
    cons: ['주차비 별도'],
    costs: { rent: 4_200 },
    links: { dropboxFolder: 'https://www.dropbox.com/scl/fo/example?dl=0' },
    media: { images: [] },
    ...overrides,
  }
}

describe('map display helpers', () => {
  it('keeps apartment names visible with an optional unit number', () => {
    expect(mapApartmentLabel(apartmentFixture())).toBe('Harbor Home · #204')
    expect(mapApartmentLabel(apartmentFixture({ unit: undefined }))).toBe('Harbor Home')
  })

  it('spreads identical coordinates deterministically without changing source data', () => {
    const first = apartmentFixture({ slug: 'alpha' })
    const second = apartmentFixture({ slug: 'bravo', rank: 2 })
    const before = JSON.stringify([first, second])

    const forward = buildMarkerPlacements([first, second])
    const reversed = buildMarkerPlacements([second, first])

    expect(forward).toEqual(reversed)
    expect(forward.alpha.position).toEqual([first.location.lat, first.location.lng])
    expect(forward.bravo.position).toEqual([second.location.lat, second.location.lng])
    expect(forward.alpha.iconOffset).not.toEqual(forward.bravo.iconOffset)
    expect(JSON.stringify([first, second])).toBe(before)
  })

  it('opens edge labels toward the inside of the candidate bounds', () => {
    const west = apartmentFixture({
      slug: 'west',
      location: { address: 'West', lat: 37.56, lng: -122.4 },
    })
    const east = apartmentFixture({
      slug: 'east',
      location: { address: 'East', lat: 37.56, lng: -122.2 },
    })

    const placements = buildMarkerPlacements([west, east])

    expect(placements.west.labelDirection).toBe('right')
    expect(placements.east.labelDirection).toBe('left')
  })

  it('keeps mobile map padding useful without squeezing narrow screens', () => {
    expect(mobileMapHorizontalPadding(320)).toBe(45)
    expect(mobileMapHorizontalPadding(390)).toBe(55)
    expect(mobileMapHorizontalPadding(800)).toBe(64)
  })

  it('formats building and explicit boolean values for Korean display', () => {
    expect(propertyTypeLabel('townhouse')).toBe('타운하우스')
    expect(buildingYearLabel(1988, 2026)).toBe('1988년 준공 · 38년차')
    expect(buildingYearLabel(2026, 2026)).toBe('2026년 준공 · 신축')
    expect(floorLabel(2, 3)).toBe('2층 / 총 3층')
    expect(booleanLabel(false)).toBe('없음')
    expect(booleanLabel(false, '가능', '불가능')).toBe('불가능')
    expect(booleanLabel(undefined)).toBe('확인 중')
  })
})

describe('apartment detail', () => {
  it('shows decision details, explicit false access values, and the Dropbox link', () => {
    const onClose = vi.fn()
    render(<ApartmentDetail apartment={apartmentFixture()} onClose={onClose} />)

    expect(screen.getAllByText('$4,200')).toHaveLength(3)
    expect(screen.getByText('1,050 ft²')).toBeInTheDocument()
    expect(screen.getByText('아파트')).toBeInTheDocument()
    expect(screen.getByText(/1988년/)).toBeInTheDocument()
    expect(screen.getAllByText('없음')).toHaveLength(2)
    expect(screen.getByText('불가능')).toBeInTheDocument()
    expect(screen.getByText('산책로가 바로 연결됨')).toBeInTheDocument()
    expect(screen.getByText('세탁기·건조기 유닛 내부')).toBeInTheDocument()

    const dropboxLink = screen.getByRole('link', { name: /사진 · 영상 전체 보기/ })
    expect(dropboxLink).toHaveAttribute('href', 'https://www.dropbox.com/scl/fo/example?dl=0')

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
