import { useEffect, useMemo, useState } from 'react'
import type { Apartment } from '../data/apartments'
import { ApartmentImage } from './ApartmentImage'
import { Icon } from './Icons'
import {
  booleanLabel,
  buildingYearLabel,
  commuteModeLabel,
  floorLabel,
  formatDate,
  formatMoney,
  monthlyTotal,
  propertyTypeLabel,
  statusLabel,
} from './formatters'

interface ApartmentDetailProps {
  apartment: Apartment
  onClose: () => void
}

const scoreLabels: Record<string, string> = {
  location: '동네',
  value: '가격',
  unit: '유닛',
  amenities: '편의시설',
  commute: '출퇴근',
  overall: '종합',
}

export function ApartmentDetail({ apartment, onClose }: ApartmentDetailProps) {
  const { access, building, lease, parking } = apartment
  const images = apartment.media?.images ?? []
  const [activeImageId, setActiveImageId] = useState(images[0]?.id)

  useEffect(() => {
    setActiveImageId(images[0]?.id)
  }, [apartment.slug, images])

  const activeImage = images.find((image) => image.id === activeImageId) ?? images[0]
  const visitDate = formatDate(apartment.visitDate)
  const availableDate = formatDate(apartment.unit?.availableDate)
  const scoreEntries = useMemo(
    () => Object.entries(apartment.scores ?? {}).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
    [apartment.scores],
  )
  const overallScore = apartment.scores?.overall
  const roomConfiguration = [
    typeof apartment.unit?.beds === 'number' ? `${apartment.unit.beds} bed` : null,
    typeof apartment.unit?.baths === 'number' ? `${apartment.unit.baths} bath` : null,
  ].filter(Boolean).join(' · ') || '확인 중'
  const showAccess = Boolean(access && (
    typeof access.entryStairs === 'boolean'
    || typeof access.internalStairs === 'boolean'
    || typeof access.elevator === 'boolean'
    || typeof access.stepFreeEntry === 'boolean'
    || access.notes
  ))

  return (
    <article className="detail-view" aria-labelledby="apartment-detail-title">
      <div className="detail-toolbar">
        <button autoFocus className="back-button" onClick={onClose} type="button" aria-label="상세 닫기">
          <Icon name="close" size={19} />
          <span>Top 5로 돌아가기</span>
        </button>
        <span className="detail-rank">NO. {apartment.rank}</span>
      </div>

      <div className="detail-scroll">
        <div className="detail-hero">
          <ApartmentImage
            alt={activeImage?.alt || apartment.name}
            className="detail-hero-image"
            src={activeImage?.full || activeImage?.thumbnail}
          />
          <span className="hero-status"><span className={`status-dot status-${apartment.status}`} />{statusLabel(apartment.status)}</span>
          {images.length > 0 ? <span className="photo-count"><Icon name="image" size={14} /> {images.length}</span> : null}
        </div>

        {images.length > 1 ? (
          <div className="thumbnail-strip" aria-label="사진 선택">
            {images.map((image, index) => (
              <button
                aria-label={`${index + 1}번째 사진 보기`}
                aria-pressed={image.id === activeImage?.id}
                className="thumbnail-button"
                key={image.id}
                onClick={() => setActiveImageId(image.id)}
                type="button"
              >
                <ApartmentImage alt="" className="thumbnail-image" src={image.thumbnail || image.full} />
              </button>
            ))}
          </div>
        ) : null}

        <DropboxFolderLink href={apartment.links?.dropboxFolder} />

        <div className="detail-content">
          <header className="detail-heading">
            <div>
              <p className="detail-area"><Icon name="pin" size={15} /> {apartment.location.area || 'Bay Area'}</p>
              <h2 id="apartment-detail-title">
                {apartment.name}
                {apartment.unit?.number ? <small>#{apartment.unit.number}</small> : null}
              </h2>
              <p className="detail-address">{apartment.location.address}</p>
            </div>
            {typeof overallScore === 'number' ? (
              <div className="overall-score" aria-label={`종합 점수 ${overallScore}점`}>
                <strong>{overallScore.toFixed(1)}</strong>
                <span>/ 10</span>
              </div>
            ) : null}
          </header>

          <section className="price-summary" aria-label="월 예상 비용">
            <div>
              <span>월 예상 총비용</span>
              <strong>{formatMoney(monthlyTotal(apartment))}</strong>
            </div>
            <p>렌트와 매월 반복되는 예상 비용을 합산했어요.</p>
          </section>

          <div className="quick-facts six-facts" aria-label="핵심 주거 정보">
            <div><Icon name="home" /><span>기본 렌트</span><strong>{formatMoney(apartment.costs.rent)}</strong></div>
            <div><Icon name="map" /><span>면적</span><strong>{typeof apartment.unit?.sqft === 'number' ? `${apartment.unit.sqft.toLocaleString()} ft²` : '확인 중'}</strong></div>
            <div><Icon name="bed" /><span>구조</span><strong>{roomConfiguration}</strong></div>
            <div><Icon name="home" /><span>건물 유형</span><strong>{propertyTypeLabel(building?.propertyType)}</strong></div>
            <div><Icon name="calendar" /><span>준공 · 연식</span><strong>{buildingYearLabel(building?.yearBuilt)}</strong></div>
            <div><Icon name="home" /><span>층수</span><strong>{floorLabel(apartment.unit?.floor, building?.totalFloors)}</strong></div>
          </div>

          {(apartment.unit?.number || availableDate) ? (
            <div className="unit-meta-strip">
              {apartment.unit?.number ? <span><b>유닛</b> #{apartment.unit.number}</span> : null}
              {availableDate ? <span><b>입주 가능</b> {availableDate}</span> : null}
            </div>
          ) : null}

          {showAccess && access ? (
            <DetailSection title="이동 · 접근" eyebrow="ACCESS">
              <div className="access-grid">
                <AccessFact label="현관 계단" value={access.entryStairs} />
                <AccessFact label="실내 계단" value={access.internalStairs} />
                <AccessFact label="엘리베이터" value={access.elevator} />
                <AccessFact falseLabel="불가능" label="무단차 출입" trueLabel="가능" value={access.stepFreeEntry} />
              </div>
              {access.notes ? <p className="access-note">{access.notes}</p> : null}
            </DetailSection>
          ) : null}

          {(lease?.termMonths || lease?.notes || parking?.type || typeof parking?.spaces === 'number' || parking?.notes) ? (
            <DetailSection title="계약 · 주차" eyebrow="LEASE & PARKING">
              <div className="lease-parking-grid">
                {(lease?.termMonths || lease?.notes) ? (
                  <div>
                    <span className="lease-parking-icon"><Icon name="calendar" size={19} /></span>
                    <div>
                      <span>계약 조건</span>
                      <strong>{lease.termMonths ? `${lease.termMonths}개월 계약` : '기간 확인 중'}</strong>
                      {lease.notes ? <p>{lease.notes}</p> : null}
                    </div>
                  </div>
                ) : null}
                {(parking?.type || typeof parking?.spaces === 'number' || parking?.notes) ? (
                  <div>
                    <span className="lease-parking-icon"><Icon name="car" size={19} /></span>
                    <div>
                      <span>주차 정보</span>
                      <strong>
                        {[formatParkingType(parking.type), typeof parking.spaces === 'number' ? `${parking.spaces}대` : null].filter(Boolean).join(' · ') || '확인 중'}
                      </strong>
                      {parking.notes ? <p>{parking.notes}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </DetailSection>
          ) : null}

          <DetailSection title="비용 정리" eyebrow="MONTHLY COST">
            <dl className="cost-list">
              <CostRow label="기본 렌트" value={apartment.costs.rent} emphasized />
              <CostRow label="고정 관리비" value={apartment.costs.recurringFees} />
              <CostRow label="주차" value={apartment.costs.parking} />
              <CostRow label="공과금 예상" value={apartment.costs.utilitiesEstimate} />
              {typeof apartment.costs.deposit === 'number' ? <CostRow label="보증금 (1회)" value={apartment.costs.deposit} /> : null}
            </dl>
            {apartment.costs.promotion ? (
              <div className="promotion-note"><Icon name="sparkle" size={18} /><span><b>프로모션</b>{apartment.costs.promotion}</span></div>
            ) : null}
          </DetailSection>

          {apartment.commutes?.length ? (
            <DetailSection title="출퇴근" eyebrow="COMMUTE">
              <div className="commute-list">
                {apartment.commutes.map((commute) => (
                  <div className="commute-row" key={`${commute.label}-${commute.minutes}`}>
                    <span className="commute-icon"><Icon name="car" size={19} /></span>
                    <div><strong>{commute.label}</strong><span>{commuteModeLabel(commute.mode)}</span></div>
                    <b>{commute.minutes}분</b>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {apartment.surroundings?.length ? (
            <DetailSection title="주변 환경" eyebrow="NEIGHBORHOOD">
              <ul className="surroundings-list">
                {apartment.surroundings.map((item) => <li key={item}><Icon name="pin" size={15} />{item}</li>)}
              </ul>
            </DetailSection>
          ) : null}

          {(apartment.pros?.length || apartment.cons?.length) ? (
            <DetailSection title="직접 본 인상" eyebrow="FIELD NOTES">
              <div className="pros-cons-grid">
                {apartment.pros?.length ? <NoteList icon="check" label="좋았던 점" items={apartment.pros} tone="positive" /> : null}
                {apartment.cons?.length ? <NoteList icon="minus" label="아쉬운 점" items={apartment.cons} tone="negative" /> : null}
              </div>
            </DetailSection>
          ) : null}

          {apartment.amenities?.length ? (
            <DetailSection title="편의시설" eyebrow="AMENITIES">
              <ul className="amenity-list">
                {apartment.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}
              </ul>
            </DetailSection>
          ) : null}

          {apartment.features?.length ? (
            <DetailSection title="기타 특징" eyebrow="FEATURES">
              <ul className="feature-list">
                {apartment.features.map((feature) => <li key={feature}><Icon name="check" size={15} />{feature}</li>)}
              </ul>
            </DetailSection>
          ) : null}

          {scoreEntries.length ? (
            <DetailSection title="우리의 점수" eyebrow="SCORECARD">
              <div className="score-list">
                {scoreEntries.map(([key, score]) => (
                  <div className="score-row" key={key}>
                    <span>{scoreLabels[key] ?? key}</span>
                    <div className="score-track"><i style={{ width: `${Math.min(10, Math.max(0, score)) * 10}%` }} /></div>
                    <b>{score.toFixed(1)}</b>
                  </div>
                ))}
              </div>
            </DetailSection>
          ) : null}

          {apartment.notes ? (
            <blockquote className="personal-note">
              <Icon name="sparkle" />
              <div><span>나의 메모</span><p>{apartment.notes}</p></div>
            </blockquote>
          ) : null}

          {visitDate || apartment.lastVerified ? (
            <p className="verified-date">
              {visitDate ? `방문 ${visitDate}` : null}
              {visitDate && apartment.lastVerified ? ' · ' : null}
              {apartment.lastVerified ? `정보 확인 ${formatDate(apartment.lastVerified)}` : null}
            </p>
          ) : null}

          <ExternalLinks apartment={apartment} />
        </div>
      </div>
    </article>
  )
}

function AccessFact({
  falseLabel,
  label,
  trueLabel,
  value,
}: {
  falseLabel?: string
  label: string
  trueLabel?: string
  value?: boolean
}) {
  return (
    <div className="access-fact" data-state={typeof value === 'boolean' ? String(value) : 'unknown'}>
      <span>{label}</span>
      <strong>{booleanLabel(value, trueLabel, falseLabel)}</strong>
    </div>
  )
}

function formatParkingType(type?: string) {
  if (!type) return null

  const labels: Record<string, string> = {
    garage: '실내 차고',
    covered: '지붕형 주차',
    assigned: '지정 주차',
    unassigned: '비지정 주차',
    street: '노상 주차',
    tandem: '탠덤 주차',
  }

  return labels[type] ?? type
}

function DetailSection({ children, eyebrow, title }: { children: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <section className="detail-section">
      <p className="section-eyebrow">{eyebrow}</p>
      <h3>{title}</h3>
      {children}
    </section>
  )
}

function CostRow({ emphasized = false, label, value }: { emphasized?: boolean; label: string; value?: number }) {
  return (
    <div className={emphasized ? 'emphasized' : ''}>
      <dt>{label}</dt>
      <dd>{formatMoney(value)}</dd>
    </div>
  )
}

function NoteList({ icon, items, label, tone }: { icon: 'check' | 'minus'; items: string[]; label: string; tone: string }) {
  return (
    <div className={`note-list ${tone}`}>
      <strong>{label}</strong>
      <ul>{items.map((item) => <li key={item}><Icon name={icon} size={16} />{item}</li>)}</ul>
    </div>
  )
}

function ExternalLinks({ apartment }: { apartment: Apartment }) {
  const links = [
    { href: apartment.links?.listing, label: '매물 페이지' },
    { href: apartment.links?.official, label: '공식 홈페이지' },
  ].filter((link): link is { href: string; label: string } => Boolean(link.href))

  if (!links.length) return null

  return (
    <nav className="external-links" aria-label="외부 링크">
      {links.map((link) => (
        <a href={link.href} key={link.label} rel="noopener noreferrer" target="_blank">
          <span>{link.label}</span><Icon name="external" size={17} />
        </a>
      ))}
    </nav>
  )
}

function DropboxFolderLink({ href }: { href?: string }) {
  if (!href) return null

  return (
    <div className="dropbox-cta-wrap">
      <a
        aria-label="Dropbox에서 사진과 영상 전체 폴더 열기 (새 탭)"
        className="dropbox-cta"
        href={href}
        rel="noopener noreferrer"
        target="_blank"
      >
        <span className="dropbox-cta-icon"><Icon name="image" size={21} /></span>
        <span className="dropbox-cta-copy">
          <small>DROPBOX FOLDER</small>
          <strong>사진 · 영상 전체 폴더 보기</strong>
        </span>
        <Icon className="dropbox-cta-arrow" name="external" size={18} />
      </a>
    </div>
  )
}
