/**
 * Unit abbreviation for callouts, equations, and quantity labels.
 * Meaning-preserving; longest patterns first so compound units resolve
 * before their components ("passenger-kilometres" → pkm, not "pkm"-of-km).
 */
const UNIT_ABBREVIATIONS: Array<[RegExp, string]> = [
  [/passenger-kilometres?/gi, 'pkm'],
  [/passenger kilometres?/gi, 'pkm'],
  [/square metre-years?/gi, 'm²·yr'],
  [/square metres?/gi, 'm²'],
  [/square meters?/gi, 'm²'],
  [/cubic metres?/gi, 'm³'],
  [/cubic meters?/gi, 'm³'],
  [/kilowatt-hours?/gi, 'kWh'],
  [/kilowatt hours?/gi, 'kWh'],
  [/kilometres?/gi, 'km'],
  [/kilometers?/gi, 'km'],
  [/kilograms?/gi, 'kg'],
  [/kilowatts?\b/gi, 'kW'],
  [/\btonnes?\b/gi, 't'],
  [/\blitres?\b/gi, 'L'],
  [/\bliters?\b/gi, 'L'],
  [/metres?/gi, 'm'],
  [/meters?/gi, 'm'],
  [/\bhours?\b/gi, 'h'],
  [/\byears?\b/gi, 'yr'],
  [/ per year/gi, '/yr'],
]

export function abbreviateUnit(label: string): string {
  let out = label
  for (const [pattern, replacement] of UNIT_ABBREVIATIONS) {
    out = out.replace(pattern, replacement)
  }
  return out
}
