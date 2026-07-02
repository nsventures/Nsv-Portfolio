/** Map alternate spellings → canonical DB city name (matches seeded cities). */
const CITY_ALIASES: Record<string, string> = {
  gurugram: 'Gurgaon',
  gurgaon: 'Gurgaon',
  bengaluru: 'Bangalore',
  bangalore: 'Bangalore',
  delhi: 'Delhi NCR',
  'delhi ncr': 'Delhi NCR',
  newdelhi: 'Delhi NCR',
  ncr: 'Delhi NCR',
  bhubneshwar: 'Bhubaneswar',
  bhubaneswar: 'Bhubaneswar',
  bhubaneshwar: 'Bhubaneswar',
  cuttuck: 'Kolkata',
  cuttack: 'Kolkata',
  ghaziabad: 'Noida',
  faridabad: 'Delhi NCR',
  sonipat: 'Delhi NCR',
  mohali: 'Chandigarh',
  'greater noida': 'Noida',
  vizag: 'Visakhapatnam',
  visakhapatnam: 'Visakhapatnam',
}

export function canonicalCityName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return trimmed
  const key = trimmed.toLowerCase().replace(/\s+/g, ' ')
  return CITY_ALIASES[key] ?? trimmed
}
