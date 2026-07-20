import { useEffect, useMemo, useRef, useState } from 'react'
import { apartments } from './data/apartments'
import type { Apartment } from './data/apartments'
import { ApartmentCard } from './components/ApartmentCard'
import { ApartmentDetail } from './components/ApartmentDetail'
import { ApartmentMap } from './components/ApartmentMap'
import { Icon } from './components/Icons'

const apartmentQueryParameter = 'apartment'
const apartmentHistoryStateKey = '__caApartmentsDetail'

function historyStateRecord(): Record<string, unknown> {
  const state: unknown = window.history.state
  return state && typeof state === 'object' && !Array.isArray(state)
    ? state as Record<string, unknown>
    : {}
}

function historyStateWithApartment(slug: string): Record<string, unknown> {
  return {
    ...historyStateRecord(),
    [apartmentHistoryStateKey]: slug,
  }
}

function historyStateWithoutApartment(): Record<string, unknown> {
  const {
    [apartmentHistoryStateKey]: _apartmentDetail,
    ...remainingState
  } = historyStateRecord()
  return remainingState
}

function apartmentUrl(slug?: string): string {
  const url = new URL(window.location.href)
  if (slug) {
    url.searchParams.set(apartmentQueryParameter, slug)
  } else {
    url.searchParams.delete(apartmentQueryParameter)
  }
  return `${url.pathname}${url.search}${url.hash}`
}

function apartmentSlugFromUrl(validSlugs: Set<string>): string | undefined {
  const slug = new URL(window.location.href).searchParams.get(apartmentQueryParameter)
  return slug && validSlugs.has(slug) ? slug : undefined
}

export default function App() {
  const sortedApartments = useMemo(
    () => [...apartments].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
    [],
  )
  const validSlugs = useMemo(
    () => new Set(sortedApartments.map((apartment) => apartment.slug)),
    [sortedApartments],
  )
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(() =>
    apartmentSlugFromUrl(validSlugs),
  )
  const closeNavigationPending = useRef(false)
  const topFive = sortedApartments.slice(0, 5)
  const selectedApartment = sortedApartments.find((apartment) => apartment.slug === selectedSlug)

  useEffect(() => {
    function handlePopState() {
      closeNavigationPending.current = false
      setSelectedSlug(apartmentSlugFromUrl(validSlugs))
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [validSlugs])

  function selectApartment(apartment: Apartment) {
    if (apartment.slug === selectedSlug) return

    const method = selectedApartment ? 'replaceState' : 'pushState'
    window.history[method](
      historyStateWithApartment(apartment.slug),
      '',
      apartmentUrl(apartment.slug),
    )
    setSelectedSlug(apartment.slug)
  }

  function closeApartment() {
    if (!selectedApartment || closeNavigationPending.current) return

    if (historyStateRecord()[apartmentHistoryStateKey] === selectedApartment.slug) {
      closeNavigationPending.current = true
      window.history.back()
      return
    }

    window.history.replaceState(historyStateWithoutApartment(), '', apartmentUrl())
    setSelectedSlug(undefined)
  }

  return (
    <div className={`app-shell ${selectedApartment ? 'has-selection' : ''}`}>
      <a className="skip-link" href="#candidate-panel">후보 목록으로 건너뛰기</a>

      <ApartmentMap
        apartments={sortedApartments}
        onSelect={selectApartment}
        selectedSlug={selectedApartment?.slug}
      />

      <aside className="candidate-panel" id="candidate-panel" aria-label="아파트 후보 정보">
        <div className="sheet-handle" aria-hidden="true"><span /></div>

        {selectedApartment ? (
          <ApartmentDetail apartment={selectedApartment} onClose={closeApartment} />
        ) : (
          <div className="shortlist-view">
            <header className="site-header">
              <div className="brand-row">
                <div className="brand-mark" aria-hidden="true">🇺🇸</div>
                <div>
                  <p>BAY AREA · HOME SEARCH</p>
                  <h1>우리 집 후보</h1>
                </div>
              </div>
              <p className="site-intro">직접 둘러본 집을 한곳에 모았어요.<br />지도에서 핀을 누르면 자세히 볼 수 있어요.</p>
              <div className="search-summary" aria-label={`전체 후보 ${sortedApartments.length}곳`}>
                <span><i /> 후보 {sortedApartments.length}곳</span>
                <span>San Mateo County</span>
              </div>
            </header>

            <section className="shortlist" aria-labelledby="top-five-title">
              <div className="section-title-row">
                <div>
                  <p>OUR SHORTLIST</p>
                  <h2 id="top-five-title">Top 5 Candidates</h2>
                </div>
                {topFive.length ? <span>{topFive.length} / {sortedApartments.length}</span> : null}
              </div>

              {topFive.length ? (
                <div className="card-list">
                  {topFive.map((apartment) => (
                    <ApartmentCard apartment={apartment} key={apartment.slug} onSelect={selectApartment} />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
            </section>

            <footer className="panel-footer">
              <span><Icon name="pin" size={15} /> 핀을 눌러 상세 보기</span>
              <small>Last updated automatically</small>
            </footer>
          </div>
        )}
      </aside>

      <div className="selection-announcer" aria-live="polite">
        {selectedApartment ? `${selectedApartment.name} 상세 정보가 열렸습니다.` : ''}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="empty-state">
      <span><Icon name="home" size={27} /></span>
      <h3>아직 공개된 집 후보가 없어요</h3>
      <p>후보 정보를 채우고 공개하면 이곳과 지도에 바로 나타납니다.</p>
    </div>
  )
}
