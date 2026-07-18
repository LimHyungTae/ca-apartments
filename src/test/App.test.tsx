import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Apartment } from '../data/types'

const apartmentRecords = vi.hoisted(() => [] as Apartment[])

vi.mock('../data/apartments', () => ({
  apartments: apartmentRecords,
}))

vi.mock('../components/ApartmentMap', () => ({
  ApartmentMap: ({
    apartments,
    onSelect,
    selectedSlug,
  }: {
    apartments: Apartment[]
    onSelect: (apartment: Apartment) => void
    selectedSlug?: string
  }) => (
    <section aria-label="아파트 후보 지도" data-selected-slug={selectedSlug}>
      {apartments.map((apartment) => (
        <button
          aria-label={`지도에서 ${apartment.name} 선택`}
          key={apartment.slug}
          onClick={() => onSelect(apartment)}
          type="button"
        >
          {apartment.rank}
        </button>
      ))}
    </section>
  ),
}))

import App from '../App'

function apartmentFixture(rank: number, name: string): Apartment {
  const slug = name.toLowerCase().replaceAll(' ', '-')

  return {
    published: true,
    slug,
    name,
    rank,
    status: rank === 1 ? 'visited' : 'considering',
    location: {
      address: `${rank} Test Street, San Mateo, CA`,
      area: 'San Mateo',
      lat: 37.56 + rank / 1_000,
      lng: -122.31,
    },
    unit: { beds: 2, baths: 2, sqft: 1_000 + rank },
    costs: {
      rent: 3_500 + rank,
      recurringFees: 100,
      parking: 100,
      utilitiesEstimate: 150,
    },
    pros: ['채광이 좋음'],
    cons: ['도로 소음'],
    links: { dropboxFolder: `https://www.dropbox.com/scl/fo/${slug}` },
    media: { images: [] },
  }
}

beforeEach(() => {
  apartmentRecords.splice(
    0,
    apartmentRecords.length,
    apartmentFixture(3, 'Charlie Home'),
    apartmentFixture(1, 'Alpha Home'),
    apartmentFixture(6, 'Foxtrot Home'),
    apartmentFixture(4, 'Delta Home'),
    apartmentFixture(2, 'Bravo Home'),
    apartmentFixture(5, 'Echo Home'),
  )
})

describe('App', () => {
  it('shows the five best-ranked homes in rank order', () => {
    render(<App />)

    const panel = within(screen.getByLabelText('아파트 후보 정보'))
    expect(panel.getByRole('heading', { name: 'Top 5 Candidates' })).toBeInTheDocument()
    expect(panel.getByText('5 / 6')).toBeInTheDocument()

    const cards = panel.getAllByRole('button', { name: /상세 보기$/ })
    expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
      'Alpha Home 상세 보기',
      'Bravo Home 상세 보기',
      'Charlie Home 상세 보기',
      'Delta Home 상세 보기',
      'Echo Home 상세 보기',
    ])
    expect(panel.queryByRole('button', { name: 'Foxtrot Home 상세 보기' })).not.toBeInTheDocument()
  })

  it('opens a card detail, exposes the Dropbox link, and returns to Top 5', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Alpha Home 상세 보기' }))

    expect(screen.getByRole('heading', { name: 'Alpha Home' })).toBeInTheDocument()
    expect(screen.getByLabelText('월 예상 비용')).toHaveTextContent('$3,851')
    expect(screen.getByRole('link', { name: /사진 · 영상 전체 보기/ })).toHaveAttribute(
      'href',
      'https://www.dropbox.com/scl/fo/alpha-home',
    )
    expect(screen.getByRole('link', { name: /사진 · 영상 전체 보기/ })).toHaveAttribute(
      'target',
      '_blank',
    )

    fireEvent.click(screen.getByRole('button', { name: '상세 닫기' }))

    expect(screen.getByRole('heading', { name: 'Top 5 Candidates' })).toBeInTheDocument()
  })

  it('opens any public candidate selected from the map, including homes outside Top 5', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '지도에서 Foxtrot Home 선택' }))

    expect(screen.getByRole('heading', { name: 'Foxtrot Home' })).toBeInTheDocument()
    expect(screen.getByLabelText('아파트 후보 지도')).toHaveAttribute(
      'data-selected-slug',
      'foxtrot-home',
    )
  })

  it('renders a clear empty state when no apartment is published', () => {
    apartmentRecords.splice(0)

    render(<App />)

    expect(screen.getByText('아직 공개된 집 후보가 없어요')).toBeInTheDocument()
    expect(screen.getByLabelText('전체 후보 0곳')).toBeInTheDocument()
  })
})
