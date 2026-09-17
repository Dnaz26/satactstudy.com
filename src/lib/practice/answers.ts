/** SAT student-produced answers accept equivalent fractions and finite decimals. */
export function answersMatch(selected: string, correct: string): boolean {
  const a = selected.trim().toLowerCase()
  const b = correct.trim().toLowerCase()
  if (!a || !b) return false
  if (a === b) return true
  function number(value: string): number {
    const clean = value.replace(/,/g, '')
    if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(clean)) return Number(clean)
    const fraction = clean.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/)
    return fraction && Number(fraction[2]) !== 0 ? Number(fraction[1]) / Number(fraction[2]) : NaN
  }
  const na = number(a), nb = number(b)
  if (!Number.isFinite(na) || !Number.isFinite(nb)) return false
  if (Math.abs(na - nb) < 1e-9) return true
  // SAT SPR directions permit rounding or truncating a decimal when it will
  // not fit the five positive (six negative) entry characters.
  const decimal = a.replace(/,/g, '').match(/^[+-]?(\d*)\.(\d+)$/)
  if (!decimal) return false
  const integerDigits = decimal[1].replace(/^0+(?=\d)/, '').length
  const precision = decimal[2].length
  if (precision < Math.max(1, 4 - integerDigits) || precision > 12) return false
  const scale = 10 ** precision
  return Math.abs(na - Math.round(nb * scale) / scale) < 1e-9
    || Math.abs(na - Math.trunc(nb * scale) / scale) < 1e-9
}
