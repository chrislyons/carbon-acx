/**
 * Unit abbreviation for callouts, equations, and quantity labels.
 * Meaning-preserving; longest patterns first so compound units resolve
 * before their components ("passenger-kilometres" -> pkm, and " per year"
 * before the standalone "years" rule). Every pattern is token-bounded so
 * unknown words containing a unit fragment pass through unchanged.
 */
const UNIT_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/passenger-kilometres?\b/gi, 'pkm'],
  [/passenger kilometres?\b/gi, 'pkm'],
  [/square metre-years?\b/gi, 'm\u00b2\u00b7yr'],
  [/square metres?\b/gi, 'm\u00b2'],
  [/square meters?\b/gi, 'm\u00b2'],
  [/cubic metres?\b/gi, 'm\u00b3'],
  [/cubic meters?\b/gi, 'm\u00b3'],
  [/kilowatt-hours?\b/gi, 'kWh'],
  [/kilowatt hours?\b/gi, 'kWh'],
  [/ per year\b/gi, '/yr'],
  [/kilometres?\b/gi, 'km'],
  [/kilometers?\b/gi, 'km'],
  [/kilograms?\b/gi, 'kg'],
  [/kilowatts?\b/gi, 'kW'],
  [/\btonnes?\b/gi, 't'],
  [/\blitres?\b/gi, 'L'],
  [/\bliters?\b/gi, 'L'],
  [/\bmetres?\b/gi, 'm'],
  [/\bmeters?\b/gi, 'm'],
  [/\bhours?\b/gi, 'h'],
  [/\byears?\b/gi, 'yr'],
]

export function abbreviateUnit(label: string): string {
  let out = label
  for (const [pattern, replacement] of UNIT_ABBREVIATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out
}
