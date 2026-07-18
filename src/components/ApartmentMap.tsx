import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, Tooltip, ZoomControl, useMap } from 'react-leaflet'
import type { Apartment } from '../data/apartments'
import { Icon } from './Icons'
import {
  buildMarkerPlacements,
  mapApartmentLabel,
  mobileMapHorizontalPadding,
  type MarkerPlacement,
} from './formatters'

const BAY_AREA_CENTER: [number, number] = [37.5626, -122.305]

interface ApartmentMapProps {
  apartments: Apartment[]
  onSelect: (apartment: Apartment) => void
  selectedSlug?: string
}

export function ApartmentMap({ apartments, onSelect, selectedSlug }: ApartmentMapProps) {
  const [tileUnavailable, setTileUnavailable] = useState(false)
  const placements = useMemo(() => buildMarkerPlacements(apartments), [apartments])

  return (
    <section className="map-stage" aria-label="지도 영역">
      <MapErrorBoundary>
        <MapContainer
          aria-label="아파트 후보 지도"
          center={BAY_AREA_CENTER}
          className="apartment-map"
          scrollWheelZoom
          zoom={12}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            eventHandlers={{
              tileerror: () => setTileUnavailable(true),
              tileload: () => setTileUnavailable(false),
            }}
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="topright" />
          <MapViewport apartments={apartments} placements={placements} selectedSlug={selectedSlug} />
          {apartments.map((apartment) => {
            const selected = apartment.slug === selectedSlug
            const placement = placements[apartment.slug]
            return (
              <Marker
                eventHandlers={{ click: () => onSelect(apartment) }}
                icon={createMarkerIcon(apartment.rank, selected, placement.iconOffset)}
                key={apartment.slug}
                keyboard
                position={placement.position}
                title={`${apartment.rank}위 ${mapApartmentLabel(apartment)}`}
                zIndexOffset={selected ? 1000 : 0}
              >
                <Tooltip
                  className={`apartment-name-label${selected ? ' is-selected' : ''}`}
                  direction={placement.labelDirection}
                  interactive={false}
                  offset={placement.labelDirection === 'left' ? [-16, 0] : [16, 0]}
                  opacity={1}
                  permanent
                >
                  <strong>{mapApartmentLabel(apartment)}</strong>
                </Tooltip>
              </Marker>
            )
          })}
        </MapContainer>
      </MapErrorBoundary>

      <div className="map-caption">
        <Icon name="map" size={16} />
        <span>San Mateo · Hillsdale · Foster City</span>
      </div>

      {tileUnavailable ? (
        <div className="map-warning" role="status">
          지도를 불러오지 못했어요. 후보 목록은 계속 볼 수 있습니다.
        </div>
      ) : null}
    </section>
  )
}

function MapViewport({
  apartments,
  placements,
  selectedSlug,
}: Pick<ApartmentMapProps, 'apartments' | 'selectedSlug'> & { placements: Record<string, MarkerPlacement> }) {
  const map = useMap()
  const [viewportRevision, setViewportRevision] = useState(0)
  const coordinateKey = apartments.map((item) => placements[item.slug].position.join(',')).join('|')
  const selected = apartments.find((item) => item.slug === selectedSlug)

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 0)
    return () => window.clearTimeout(timer)
  }, [map])

  useEffect(() => {
    let resizeTimer: number | undefined
    const refreshViewport = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        map.invalidateSize({ pan: false })
        setViewportRevision((revision) => revision + 1)
      }, 120)
    }

    window.addEventListener('resize', refreshViewport)
    window.addEventListener('orientationchange', refreshViewport)
    window.visualViewport?.addEventListener('resize', refreshViewport)

    return () => {
      window.clearTimeout(resizeTimer)
      window.removeEventListener('resize', refreshViewport)
      window.removeEventListener('orientationchange', refreshViewport)
      window.visualViewport?.removeEventListener('resize', refreshViewport)
    }
  }, [map])

  useEffect(() => {
    if (selected) {
      const zoom = 14
      const isDesktop = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 801px)').matches
      let center = L.latLng(placements[selected.slug].position)

      if (!isDesktop) {
        const size = map.getSize()
        const panelRatio = window.innerWidth <= 420 ? 0.82 : 0.78
        const visibleMapHeight = size.y * (1 - panelRatio)
        const desiredMarkerY = Math.max(56, visibleMapHeight / 2)
        const projected = map.project(center, zoom)
        center = map.unproject(
          L.point(projected.x, projected.y + size.y / 2 - desiredMarkerY),
          zoom,
        )
      }

      const reduceMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (reduceMotion) map.setView(center, zoom)
      else map.flyTo(center, zoom, { duration: 0.65 })
      return
    }

    if (!apartments.length) {
      map.setView(BAY_AREA_CENTER, 12)
      return
    }

    const isDesktop = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 801px)').matches
    const mapSize = map.getSize()
    const mapHeight = mapSize.y || window.innerHeight
    const panelRatio = window.innerWidth <= 420 ? 0.6 : 0.57
    const mobileXPadding = mobileMapHorizontalPadding(mapSize.x || window.innerWidth)
    const bounds = L.latLngBounds(apartments.map((item) => placements[item.slug].position))
    map.fitBounds(bounds, {
      maxZoom: 14,
      paddingTopLeft: isDesktop ? [470, 90] : [mobileXPadding, 86],
      paddingBottomRight: isDesktop
        ? [230, 70]
        : [mobileXPadding, Math.round(mapHeight * panelRatio + 28)],
    })
  }, [apartments, coordinateKey, map, placements, selected, viewportRevision])

  return null
}

function createMarkerIcon(rank: number, selected: boolean, [offsetX, offsetY]: [number, number]) {
  const safeRank = Number.isFinite(rank) ? rank : '·'
  return L.divIcon({
    className: 'marker-shell',
    html: `<span class="map-pin${selected ? ' is-selected' : ''}"><b>${safeRank}</b></span>`,
    iconAnchor: [22 - offsetX, 48 - offsetY],
    iconSize: [44, 50],
    tooltipAnchor: [offsetX, offsetY - 25],
  })
}

interface BoundaryProps { children: ReactNode }
interface BoundaryState { failed: boolean }

class MapErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Map rendering failed', error, info)
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="map-fallback" role="status">
          <span><Icon name="map" size={28} /></span>
          <strong>지도를 잠시 불러올 수 없어요</strong>
          <p>왼쪽 후보 목록과 상세 정보는 그대로 확인할 수 있습니다.</p>
        </div>
      )
    }

    return this.props.children
  }
}
