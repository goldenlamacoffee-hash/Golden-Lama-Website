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
  unitPriceWithVat?: unknown
  purchasePriceWithVat?: unknown
  costPerCoffee?: unknown
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
    [input.unitPriceWithVat, 'predajná cena'],
    [input.purchasePriceWithVat, 'nákupná cena'],
    [input.costPerCoffee, 'náklad na kávu'],
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

export function validateMovement(input: {
  movementType?: unknown
  quantityChange?: unknown
  unitPriceWithVat?: unknown
}): InventoryCheck {
  if (!MOVEMENT_TYPE_VALUES.includes(input.movementType as string)) {
    return { ok: false, message: 'Neplatný typ pohybu.' }
  }
  const qty = parseOptionalNumber(input.quantityChange)
  if (qty === undefined || qty === null || qty === 0) {
    return { ok: false, message: 'Zadajte nenulovú zmenu množstva.' }
  }
  const price = parseOptionalNumber(input.unitPriceWithVat)
  if (price === undefined || (price !== null && price < 0)) {
    return { ok: false, message: 'Neplatná cena.' }
  }
  return { ok: true }
}
