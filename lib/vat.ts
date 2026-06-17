/**
 * Pure VAT pricing helpers shared by the server (API/data layer) and the admin UI.
 *
 * Rules:
 *   price_with_vat    = price_without_vat * (1 + vat_rate / 100)
 *   price_without_vat = price_with_vat / (1 + vat_rate / 100)
 *
 * VAT rate is variable per item, defaults to 23 when missing, can be 0, never negative.
 * Prices are never negative and are rounded to 2 decimals.
 */
export const DEFAULT_VAT_RATE = 23

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Normalises a VAT rate: defaults to 23 when missing, clamps negatives to 0. */
export function normalizeVatRate(rate: number | null | undefined): number {
  if (rate === null || rate === undefined || !Number.isFinite(rate)) return DEFAULT_VAT_RATE
  return rate < 0 ? 0 : rate
}

export function priceWithVat(priceWithoutVat: number, vatRate: number): number {
  return round2(priceWithoutVat * (1 + normalizeVatRate(vatRate) / 100))
}

export function priceWithoutVat(priceWithVat: number, vatRate: number): number {
  return round2(priceWithVat / (1 + normalizeVatRate(vatRate) / 100))
}

/**
 * Resolves a complete {without, with, rate} price triple from whichever values
 * are provided. `source` marks the field the user last edited (the source of
 * truth); the opposite side is recomputed. Returns nulls when no price is given.
 */
export function resolveVatPair(args: {
  withoutVat: number | null | undefined
  withVat: number | null | undefined
  vatRate: number | null | undefined
  source?: 'withoutVat' | 'withVat'
}): { withoutVat: number | null; withVat: number | null; vatRate: number } {
  const rate = normalizeVatRate(args.vatRate)
  const wo = args.withoutVat ?? null
  const wv = args.withVat ?? null

  if (wo === null && wv === null) {
    return { withoutVat: null, withVat: null, vatRate: rate }
  }
  if (args.source === 'withVat' && wv !== null) {
    return { withoutVat: priceWithoutVat(wv, rate), withVat: round2(wv), vatRate: rate }
  }
  if (args.source === 'withoutVat' && wo !== null) {
    return { withoutVat: round2(wo), withVat: priceWithVat(wo, rate), vatRate: rate }
  }
  // No explicit source: derive the missing side, preferring without-VAT as truth.
  if (wo !== null) {
    return { withoutVat: round2(wo), withVat: wv !== null ? round2(wv) : priceWithVat(wo, rate), vatRate: rate }
  }
  return { withoutVat: priceWithoutVat(wv as number, rate), withVat: round2(wv as number), vatRate: rate }
}
