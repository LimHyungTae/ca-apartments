import generatedApartments from '../generated/apartments.json'

import type { Apartment, ApartmentCosts } from './types'

export type {
  Apartment,
  ApartmentAccess,
  ApartmentBuilding,
  ApartmentCommute,
  ApartmentCosts,
  ApartmentImage,
  ApartmentLease,
  ApartmentLinks,
  ApartmentParking,
  ApartmentScores,
  ApartmentStatus,
  ApartmentUnit,
  PropertyType,
} from './types'

export const apartments = generatedApartments as Apartment[]

export function calculateMonthlyTotal(costs: ApartmentCosts): number {
  return (
    (costs.rent ?? 0) +
    (costs.recurringFees ?? 0) +
    (costs.parking ?? 0) +
    (costs.utilitiesEstimate ?? 0)
  )
}

export function getTopApartments(
  items: readonly Apartment[],
  limit = 3,
): Apartment[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError('limit은 0 이상의 정수여야 합니다.')
  }

  return [...items]
    .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
    .slice(0, limit)
}
