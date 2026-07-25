/**
 * The API sends money as a fixed two-decimal string and the types warn against
 * parsing it into a float, so grouping is done on the digits themselves. A
 * value that is not in that shape is shown exactly as it arrived rather than
 * being coerced into something that looks tidier than it is.
 */
export function formatEtbAmount(amount: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(amount.trim())
  if (match === null) return `${amount} ETB`

  const [, sign = '', whole = '0', fraction] = match
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${grouped}${fraction === undefined ? '' : `.${fraction}`} ETB`
}
