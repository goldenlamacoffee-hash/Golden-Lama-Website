export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export interface PasswordCheck {
  ok: boolean
  message?: string
}

export function validatePassword(password: string): PasswordCheck {
  if (typeof password !== 'string' || password.length < 8) {
    return { ok: false, message: 'Heslo musí mať aspoň 8 znakov.' }
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'Heslo musí obsahovať písmená aj číslice.' }
  }
  return { ok: true }
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && value === d.toISOString().slice(0, 10)
}

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value)
}

export interface ShiftCheck {
  ok: boolean
  message?: string
}

const ENTRY_TYPE_VALUES = ['work_shift', 'vacation', 'sick_leave', 'unavailable', 'training', 'other']
const STATUS_VALUES = ['draft', 'published', 'cancelled']

/**
 * Validates the shape of a calendar entry payload. Supports multi-day ranges,
 * entry types, and all-day entries (where times are omitted).
 */
export function validateShift(input: {
  staffUserId?: unknown
  entryType?: unknown
  allDay?: unknown
  startDate?: unknown
  endDate?: unknown
  startTime?: unknown
  endTime?: unknown
  status?: unknown
}): ShiftCheck {
  if (typeof input.staffUserId !== 'string' || input.staffUserId.length === 0) {
    return { ok: false, message: 'Vyberte zamestnanca.' }
  }
  if (input.entryType !== undefined && !ENTRY_TYPE_VALUES.includes(input.entryType as string)) {
    return { ok: false, message: 'Neplatný typ záznamu.' }
  }
  if (!isValidDate(input.startDate)) {
    return { ok: false, message: 'Neplatný dátum začiatku.' }
  }
  if (!isValidDate(input.endDate)) {
    return { ok: false, message: 'Neplatný dátum konca.' }
  }
  if ((input.endDate as string) < (input.startDate as string)) {
    return { ok: false, message: 'Dátum konca musí byť rovnaký alebo neskorší ako začiatok.' }
  }

  const allDay = input.allDay === true

  if (!allDay) {
    if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
      return { ok: false, message: 'Neplatný čas. Zadajte časy alebo zvoľte celodenný záznam.' }
    }
    // Time ordering only matters within a single day; multi-day ranges span midnight.
    if (
      (input.startDate as string) === (input.endDate as string) &&
      (input.startTime as string) >= (input.endTime as string)
    ) {
      return { ok: false, message: 'Koniec musí byť po začiatku.' }
    }
  }

  if (input.status !== undefined && !STATUS_VALUES.includes(input.status as string)) {
    return { ok: false, message: 'Neplatný stav záznamu.' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export interface InventoryCheck {
  ok: boolean
  message?: string
}

const INVENTORY_KIND_VALUES = ['operating', 'asset']
const MOVEMENT_TYPE_VALUES = ['purchase', 'usage', 'adjustment', 'waste', 'transfer']

/** Parses an optional numeric field. Returns undefined when empty/null, NaN sentinel on invalid. */
export function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined // undefined signals "invalid"
}

export function validateInventoryItem(input: {
  name?: unknown
  inventoryKind?: unknown
  stockQuantity?: unknown
  minimumStock?: unknown
  unitPriceWithoutVat?: unknown
  unitPriceWithVat?: unknown
  purchasePriceWithoutVat?: unknown
  purchasePriceWithVat?: unknown
  vatRate?: unknown
}): InventoryCheck {
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    return { ok: false, message: 'Zadajte názov položky.' }
  }
  if (input.name.trim().length > 200) {
    return { ok: false, message: 'Názov je príliš dlhý.' }
  }
  if (!INVENTORY_KIND_VALUES.includes(input.inventoryKind as string)) {
    return { ok: false, message: 'Neplatný druh položky.' }
  }
  const stock = parseOptionalNumber(input.stockQuantity)
  // Stock is optional and defaults to 0; only reject when explicitly invalid or negative.
  if (stock === undefined || (stock !== null && stock < 0)) {
    return { ok: false, message: 'Neplatné množstvo na sklade.' }
  }
  for (const [val, label] of [
    [input.minimumStock, 'minimálny stav'],
    [input.unitPriceWithoutVat, 'predajná cena bez DPH'],
    [input.unitPriceWithVat, 'predajná cena s DPH'],
    [input.purchasePriceWithoutVat, 'nákupná cena bez DPH'],
    [input.purchasePriceWithVat, 'nákupná cena s DPH'],
  ] as const) {
    const parsed = parseOptionalNumber(val)
    if (parsed === undefined) {
      return { ok: false, message: `Neplatná hodnota: ${label}.` }
    }
    if (parsed !== null && parsed < 0) {
      return { ok: false, message: `Hodnota nesmie byť záporná: ${label}.` }
    }
  }
  const vat = parseOptionalNumber(input.vatRate)
  if (vat === undefined) {
    return { ok: false, message: 'Neplatná sadzba DPH.' }
  }
  if (vat !== null && vat < 0) {
    return { ok: false, message: 'Sadzba DPH nesmie byť záporná.' }
  }
  return { ok: true }
}

export function validateMovement(input: {
  movementType?: unknown
  quantityChange?: unknown
  unitPriceWithoutVat?: unknown
  unitPriceWithVat?: unknown
  vatRate?: unknown
}): InventoryCheck {
  if (!MOVEMENT_TYPE_VALUES.includes(input.movementType as string)) {
    return { ok: false, message: 'Neplatný typ pohybu.' }
  }
  const qty = parseOptionalNumber(input.quantityChange)
  if (qty === undefined || qty === null || qty === 0) {
    return { ok: false, message: 'Zadajte nenulovú zmenu množstva.' }
  }
  for (const [val, label] of [
    [input.unitPriceWithoutVat, 'cena bez DPH'],
    [input.unitPriceWithVat, 'cena s DPH'],
  ] as const) {
    const price = parseOptionalNumber(val)
    if (price === undefined || (price !== null && price < 0)) {
      return { ok: false, message: `Neplatná ${label}.` }
    }
  }
  const vat = parseOptionalNumber(input.vatRate)
  if (vat === undefined || (vat !== null && vat < 0)) {
    return { ok: false, message: 'Neplatná sadzba DPH.' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Motivation / Golden Points
// ---------------------------------------------------------------------------

const MOTIVATION_CATEGORY_VALUES = [
  'sales',
  'customer_smile',
  'team_help',
  'reliability',
  'cleanliness_preparation',
  'event_energy',
  'bonus',
  'correction',
]
const MOTIVATION_SOURCE_VALUES = ['manual', 'pos', 'adjustment', 'team_bonus', 'correction']
const NOTE_REQUIRED_CATEGORIES = ['customer_smile', 'team_help', 'event_energy', 'correction']

export interface MotivationCheck {
  ok: boolean
  message?: string
}

export function validatePointRule(input: {
  name?: unknown
  category?: unknown
  pointsPerUnit?: unknown
  bonusPoints?: unknown
}): MotivationCheck {
  if (typeof input.name !== 'string' || input.name.trim().length === 0) {
    return { ok: false, message: 'Zadajte názov pravidla.' }
  }
  if (input.name.trim().length > 200) {
    return { ok: false, message: 'Názov je príliš dlhý.' }
  }
  if (!MOTIVATION_CATEGORY_VALUES.includes(input.category as string)) {
    return { ok: false, message: 'Neplatná kategória.' }
  }
  const pts = parseOptionalNumber(input.pointsPerUnit)
  if (pts === undefined) {
    return { ok: false, message: 'Neplatný počet bodov za jednotku.' }
  }
  const bonus = parseOptionalNumber(input.bonusPoints)
  if (bonus === undefined) {
    return { ok: false, message: 'Neplatné bonusové body.' }
  }
  return { ok: true }
}

/**
 * Validates a manual point event. `allowNegative` reflects the actor's capability;
 * when false, negative total points are rejected. Note is required for experience,
 * team, event and correction categories (and for any negative entry).
 */
export function validatePointEvent(
  input: {
    staffUserId?: unknown
    category?: unknown
    source?: unknown
    quantity?: unknown
    pointsPerUnit?: unknown
    note?: unknown
    happenedAt?: unknown
  },
  allowNegative: boolean,
): MotivationCheck {
  if (typeof input.staffUserId !== 'string' || input.staffUserId.length === 0) {
    return { ok: false, message: 'Vyberte zamestnanca.' }
  }
  if (!MOTIVATION_CATEGORY_VALUES.includes(input.category as string)) {
    return { ok: false, message: 'Neplatná kategória.' }
  }
  if (input.source !== undefined && !MOTIVATION_SOURCE_VALUES.includes(input.source as string)) {
    return { ok: false, message: 'Neplatný zdroj.' }
  }
  const qty = parseOptionalNumber(input.quantity)
  if (qty === undefined || qty === null || qty === 0) {
    return { ok: false, message: 'Zadajte nenulové množstvo.' }
  }
  const pts = parseOptionalNumber(input.pointsPerUnit)
  if (pts === undefined || pts === null) {
    return { ok: false, message: 'Zadajte počet bodov.' }
  }
  const total = qty * pts
  if (total < 0 && !allowNegative) {
    return { ok: false, message: 'Záporné body môžu zadávať iba majiteľ alebo administrátor.' }
  }
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  const needsNote = NOTE_REQUIRED_CATEGORIES.includes(input.category as string) || total < 0
  if (needsNote && note.length === 0) {
    return { ok: false, message: 'Pri tejto kategórii je poznámka povinná.' }
  }
  if (input.happenedAt !== undefined && input.happenedAt !== null && input.happenedAt !== '') {
    const d = new Date(input.happenedAt as string)
    if (Number.isNaN(d.getTime())) {
      return { ok: false, message: 'Neplatný dátum udalosti.' }
    }
  }
  return { ok: true }
}

export function validateBonusPeriod(input: {
  periodStart?: unknown
  periodEnd?: unknown
  pointValueEur?: unknown
  monthlyPersonalTarget?: unknown
  monthlyTeamTarget?: unknown
  teamBonusAmount?: unknown
}): MotivationCheck {
  if (!isValidDate(input.periodStart)) {
    return { ok: false, message: 'Neplatný začiatok obdobia.' }
  }
  if (!isValidDate(input.periodEnd)) {
    return { ok: false, message: 'Neplatný koniec obdobia.' }
  }
  if ((input.periodEnd as string) < (input.periodStart as string)) {
    return { ok: false, message: 'Koniec obdobia musí byť po začiatku.' }
  }
  for (const [val, label] of [
    [input.pointValueEur, 'hodnota bodu'],
    [input.monthlyPersonalTarget, 'osobný cieľ'],
    [input.monthlyTeamTarget, 'tímový cieľ'],
    [input.teamBonusAmount, 'tímový bonus'],
  ] as const) {
    const parsed = parseOptionalNumber(val)
    if (parsed === undefined) {
      return { ok: false, message: `Neplatná hodnota: ${label}.` }
    }
    if (parsed !== null && parsed < 0) {
      return { ok: false, message: `Hodnota nesmie byť záporná: ${label}.` }
    }
  }
  return { ok: true }
}

export function validateMultiplier(input: {
  staffUserId?: unknown
  periodStart?: unknown
  periodEnd?: unknown
  multiplier?: unknown
  note?: unknown
}): MotivationCheck {
  if (typeof input.staffUserId !== 'string' || input.staffUserId.length === 0) {
    return { ok: false, message: 'Vyberte zamestnanca.' }
  }
  if (!isValidDate(input.periodStart) || !isValidDate(input.periodEnd)) {
    return { ok: false, message: 'Neplatné obdobie.' }
  }
  const mult = parseOptionalNumber(input.multiplier)
  if (mult === undefined || mult === null || mult < 0) {
    return { ok: false, message: 'Neplatný násobiteľ.' }
  }
  const note = typeof input.note === 'string' ? input.note.trim() : ''
  if (note.length === 0) {
    return { ok: false, message: 'Pri zmene násobiteľa je poznámka povinná.' }
  }
  return { ok: true }
}
