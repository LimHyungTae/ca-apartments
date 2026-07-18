export const apartmentStatuses = [
  'considering',
  'scheduled',
  'visited',
  'rejected',
] as const

export type ApartmentStatus = (typeof apartmentStatuses)[number]

export const commuteModes = [
  'driving',
  'transit',
  'walking',
  'bicycling',
  'other',
] as const

export type CommuteMode = (typeof commuteModes)[number]

export interface ApartmentLocationDraft {
  address?: string
  area?: string
  lat?: number
  lng?: number
}

export interface ApartmentUnit {
  number?: string
  beds?: number
  baths?: number
  sqft?: number
  floor?: number
  availableDate?: string
}

export const propertyTypes = [
  'apartment',
  'condo',
  'townhouse',
  'house',
  'other',
] as const

export type PropertyType = (typeof propertyTypes)[number]

export interface ApartmentBuilding {
  propertyType?: PropertyType
  yearBuilt?: number
  totalFloors?: number
}

export interface ApartmentAccess {
  entryStairs?: boolean
  internalStairs?: boolean
  elevator?: boolean
  stepFreeEntry?: boolean
  notes?: string
}

export interface ApartmentLease {
  termMonths?: number
  notes?: string
}

export interface ApartmentParking {
  type?: string
  spaces?: number
  notes?: string
}

export interface ApartmentCosts {
  rent?: number
  recurringFees?: number
  parking?: number
  utilitiesEstimate?: number
  deposit?: number
  promotion?: string
}

export interface ApartmentCommute {
  label: string
  minutes: number
  mode?: CommuteMode
}

export interface ApartmentScores {
  location?: number
  value?: number
  unit?: number
  amenities?: number
  commute?: number
  overall?: number
}

export interface ApartmentLinks {
  official?: string
  listing?: string
  dropboxFolder?: string
}

export interface ApartmentDraft {
  published: boolean
  slug: string
  name?: string
  sourceFolder?: string
  rank?: number
  status?: ApartmentStatus
  location?: ApartmentLocationDraft
  visitDate?: string
  unit?: ApartmentUnit
  building?: ApartmentBuilding
  access?: ApartmentAccess
  lease?: ApartmentLease
  parking?: ApartmentParking
  costs?: ApartmentCosts
  commutes?: ApartmentCommute[]
  amenities?: string[]
  surroundings?: string[]
  features?: string[]
  pros?: string[]
  cons?: string[]
  notes?: string
  scores?: ApartmentScores
  links?: ApartmentLinks
  lastVerified?: string
}

export interface ApartmentImage {
  id: string
  thumbnail: string
  full: string
  alt: string
}

export interface Apartment {
  published: true
  slug: string
  name: string
  rank: number
  status: ApartmentStatus
  location: {
    address: string
    area?: string
    lat: number
    lng: number
  }
  visitDate?: string
  unit?: ApartmentUnit
  building?: ApartmentBuilding
  access?: ApartmentAccess
  lease?: ApartmentLease
  parking?: ApartmentParking
  costs: ApartmentCosts & { rent: number }
  commutes?: ApartmentCommute[]
  amenities?: string[]
  surroundings?: string[]
  features?: string[]
  pros?: string[]
  cons?: string[]
  notes?: string
  scores?: ApartmentScores
  links?: ApartmentLinks
  lastVerified?: string
  media: {
    images: ApartmentImage[]
  }
}
