export function isValidPhoneNumber(value: string): boolean {
  return /^\d{10,15}$/.test(value);
}

export function isValidCrn(value: string): boolean {
  return /^\d{1,10}$/.test(value);
}

export function isValidNpa(value: string): boolean {
  return /^\d{3}$/.test(value);
}

export function isValidNxx(value: string): boolean {
  return /^\d{3}$/.test(value);
}

export function isValidLata(value: string): boolean {
  return /^\d{3}$/.test(value);
}

export function isValidRor(value: string): boolean {
  return /^[A-Za-z0-9]{1,5}$/.test(value);
}
