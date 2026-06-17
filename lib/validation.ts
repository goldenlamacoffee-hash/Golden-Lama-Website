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
