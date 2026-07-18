import type { Apartment } from '../data/apartments'
import { ApartmentImage } from './ApartmentImage'
import { Icon } from './Icons'
import { formatMoney, monthlyTotal, statusLabel, unitLabel } from './formatters'

interface ApartmentCardProps {
  apartment: Apartment
  onSelect: (apartment: Apartment) => void
}

export function ApartmentCard({ apartment, onSelect }: ApartmentCardProps) {
  const cover = apartment.media?.images[0]

  return (
    <button
      aria-label={`${apartment.name} 상세 보기`}
      className="apartment-card"
      onClick={() => onSelect(apartment)}
      type="button"
    >
      <span className="card-photo-wrap">
        <ApartmentImage
          alt={cover?.alt || apartment.name}
          className="card-photo"
          src={cover?.thumbnail || cover?.full}
        />
        <span className="rank-chip" aria-label={`${apartment.rank}위`}>
          {apartment.rank}
        </span>
      </span>

      <span className="card-copy">
        <span className="card-meta-row">
          <span className={`status-dot status-${apartment.status}`} />
          <span>{statusLabel(apartment.status)}</span>
          {apartment.location.area ? <span className="card-area">{apartment.location.area}</span> : null}
        </span>
        <strong>{apartment.name}</strong>
        <span className="card-unit">{unitLabel(apartment)}</span>
        <span className="card-price-row">
          <span>
            <b>{formatMoney(monthlyTotal(apartment))}</b>
            <small>/월 예상</small>
          </span>
          <span className="card-arrow"><Icon name="arrow" size={18} /></span>
        </span>
      </span>
    </button>
  )
}
