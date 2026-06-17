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

/** Validates the shape of a shift payload. start/end are HH:MM strings. */
export function validateShift(input: {
  staffUserId?: unknown
  shiftDate?: unknown
  startTime?: unknown
  endTime?: unknown
  status?: unknown
}): ShiftCheck {
  if (typeof input.staffUserId !== 'string' || input.staffUserId.length === 0) {
    return { ok: false, message: 'Vyberte zamestnanca.' }
  }
  if (!isValidDate(input.shiftDate)) {
    return { ok: false, message: 'Neplatný dátum zmeny.' }
  }
  if (!isValidTime(input.startTime) || !isValidTime(input.endTime)) {
    return { ok: false, message: 'Neplatný čas zmeny.' }
  }
  if ((input.startTime as string) >= (input.endTime as string)) {
    return { ok: false, message: 'Koniec zmeny musí byť po jej začiatku.' }
  }
  if (
    input.status !== undefined &&
    !['draft', 'published', 'cancelled'].includes(input.status as string)
  ) {
    return { ok: false, message: 'Neplatný stav zmeny.' }
  }
  return { ok: true }
}
