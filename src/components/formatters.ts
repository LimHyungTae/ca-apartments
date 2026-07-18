import type { Apartment } from '../data/apartments'

export type MarkerLabelDirection = 'left' | 'right'

export interface MarkerPlacement {
  iconOffset: [number, number]
  labelDirection: MarkerLabelDirection
  position: [number, number]
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

export function formatMoney(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value)
    ? moneyFormatter.format(value)
    : '미정'
}

export function formatDate(value?: string | null) {
  if (!value) return null

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date)
}

export function monthlyTotal(apartment: Apartment) {
  const { rent, recurringFees, parking, utilitiesEstimate } = apartment.costs
  return [rent, recurringFees, parking, utilitiesEstimate].reduce<number>(
    (total, value) => total + (typeof value === 'number' ? value : 0),
    0,
  )
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    visited: '직접 둘러봄',
    scheduled: '방문 예정',
    considering: '검토 중',
    shortlisted: '최종 후보',
    contacted: '문의 완료',
    rejected: '보류',
  }

  return labels[status] ?? status
}

export function unitLabel(apartment: Apartment) {
  const bits: string[] = []
  const { unit } = apartment

  if (typeof unit?.beds === 'number') bits.push(`${unit.beds} bed`)
  if (typeof unit?.baths === 'number') bits.push(`${unit.baths} bath`)
  if (typeof unit?.sqft === 'number') bits.push(`${unit.sqft.toLocaleString()} ft²`)

  return bits.join(' · ') || '유닛 정보 확인 중'
}

export function mapApartmentLabel(apartment: Apartment) {
  const unitNumber = apartment.unit?.number?.trim()
  return unitNumber ? `${apartment.name} · #${unitNumber}` : apartment.name
}

export function propertyTypeLabel(type?: string) {
  const labels: Record<string, string> = {
    apartment: '아파트',
    condo: '콘도',
    townhouse: '타운하우스',
    house: '단독주택',
    other: '기타',
  }

  return type ? (labels[type] ?? type) : '확인 중'
}

export function buildingYearLabel(yearBuilt?: number, currentYear = new Date().getFullYear()) {
  if (typeof yearBuilt !== 'number' || !Number.isFinite(yearBuilt)) return '확인 중'

  const age = Math.max(0, currentYear - yearBuilt)
  return `${yearBuilt}년 준공 · ${age === 0 ? '신축' : `${age}년차`}`
}

export function floorLabel(unitFloor?: number, totalFloors?: number) {
  return [
    typeof unitFloor === 'number' ? `${unitFloor}층` : null,
    typeof totalFloors === 'number' ? `총 ${totalFloors}층` : null,
  ].filter(Boolean).join(' / ') || '확인 중'
}

export function booleanLabel(
  value: boolean | undefined,
  trueLabel = '있음',
  falseLabel = '없음',
) {
  if (typeof value !== 'boolean') return '확인 중'
  return value ? trueLabel : falseLabel
}

/**
 * Markers at exactly the same source coordinates receive stable screen-pixel offsets.
 * Their geographic positions and the Apartment objects are never changed.
 */
export function buildMarkerPlacements(
  apartments: readonly Pick<Apartment, 'location' | 'slug'>[],
): Record<string, MarkerPlacement> {
  const groups = new Map<string, Array<Pick<Apartment, 'location' | 'slug'>>>()
  const longitudes = apartments.map((apartment) => apartment.location.lng)
  const longitudeMidpoint = longitudes.length
    ? (Math.min(...longitudes) + Math.max(...longitudes)) / 2
    : 0

  apartments.forEach((apartment) => {
    const key = `${apartment.location.lat}|${apartment.location.lng}`
    const group = groups.get(key) ?? []
    group.push(apartment)
    groups.set(key, group)
  })

  const placements: Record<string, MarkerPlacement> = {}

  groups.forEach((group) => {
    const sorted = [...group].sort((left, right) => left.slug.localeCompare(right.slug))

    if (sorted.length === 1) {
      const apartment = sorted[0]
      placements[apartment.slug] = {
        iconOffset: [0, 0],
        labelDirection: apartments.length > 1 && apartment.location.lng >= longitudeMidpoint
          ? 'left'
          : 'right',
        position: [apartment.location.lat, apartment.location.lng],
      }
      return
    }

    const radiusPixels = Math.min(48, 28 + Math.max(0, sorted.length - 2) * 4)

    sorted.forEach((apartment, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / sorted.length
      const horizontalOffset = Math.sin(angle) * radiusPixels
      const verticalOffset = -Math.cos(angle) * radiusPixels

      placements[apartment.slug] = {
        iconOffset: [horizontalOffset, verticalOffset],
        labelDirection: horizontalOffset < 0 ? 'left' : 'right',
        position: [apartment.location.lat, apartment.location.lng],
      }
    })
  })

  return placements
}

export function commuteModeLabel(mode?: string) {
  const labels: Record<string, string> = {
    driving: '차량',
    transit: '대중교통',
    walking: '도보',
    bicycling: '자전거',
    other: '기타',
  }

  return mode ? (labels[mode] ?? mode) : '예상'
}
