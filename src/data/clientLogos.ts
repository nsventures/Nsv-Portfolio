/** Logos live in `public/Clients Logos/` — names carry spaces, so encode at use. */
export interface ClientLogo {
  name: string
  file: string
}

export const CLIENT_LOGOS: ClientLogo[] = [
  { name: "99acres", file: "99acres.webp" },
  { name: "ATS", file: "ATS.webp" },
  { name: "Anika Piccadilly", file: "Anika Piccadilly.webp" },
  { name: "Avani", file: "Avani.webp" },
  { name: "Birla Arika – Gurugram", file: "Birla Arika – Gurugram.webp" },
  { name: "Bosky The Upland", file: "Bosky The Upland.webp" },
  { name: "Brigade Group", file: "Brigade Group.webp" },
  { name: "Central Park", file: "Central Park.webp" },
  { name: "Codename Sensara – NIBM Annexe", file: "Codename Sensara – NIBM Annexe.webp" },
  { name: "DAMAC", file: "DAMAC.webp" },
  { name: "DLF", file: "DLF.webp" },
  { name: "Dawn Digital", file: "Dawn Digital.webp" },
  { name: "Eldeco", file: "Eldeco.webp" },
  { name: "Emaar", file: "Emaar.webp" },
  { name: "Eros Group", file: "Eros Group.webp" },
  { name: "GIRR Callisto – Smart Living in Nature", file: "GIRR Callisto – Smart Living in Nature.webp" },
  { name: "Godrej Properties", file: "Godrej Properties.webp" },
  { name: "Gurion", file: "Gurion.webp" },
  { name: "Hero Realty", file: "Hero Realty.webp" },
  { name: "Hiranandani", file: "Hiranandani.webp" },
  { name: "Homeland Global Park", file: "Homeland Global Park.webp" },
  { name: "Homeland Group", file: "Homeland Group.webp" },
  { name: "House of Hiranandani", file: "House of Hiranandani.webp" },
  { name: "Housing.com", file: "Housing.com.webp" },
  { name: "Infinity City – The Picture Perfect Life", file: "Infinity City – The Picture Perfect Life.webp" },
  { name: "JLPL", file: "JLPL.webp" },
  { name: "Joyville by Shapoorji Pallonji", file: "Joyville by Shapoorji Pallonji.webp" },
  { name: "Lodha", file: "Lodha.webp" },
  { name: "M3M", file: "M3M.webp" },
  { name: "Magicbricks", file: "Magicbricks.webp" },
  { name: "Merlin Group", file: "Merlin Group.webp" },
  { name: "OZEN – Group of Companies", file: "OZEN – Group of Companies.webp" },
  { name: "Omaxe", file: "Omaxe.webp" },
  { name: "Prestige Group", file: "Prestige Group.webp" },
  { name: "Prestige Palm Court", file: "Prestige Palm Court.webp" },
  { name: "Propvr", file: "Propvr.webp" },
  { name: "Provident", file: "Provident.webp" },
  { name: "Purva Eminora", file: "Purva Eminora.webp" },
  { name: "Purva", file: "Purva.webp" },
  { name: "REA Group", file: "REA Group.webp" },
  { name: "Reliance Infrastructure", file: "Reliance Infrastructure.webp" },
  { name: "Runwal Realty", file: "Runwal Realty.webp" },
  { name: "Shapoorji Pallonji", file: "Shapoorji Pallonji.webp" },
  { name: "Shri Divine Group", file: "Shri Divine Group.webp" },
  { name: "Smart World Elie Saab", file: "Smart World Elie Saab.webp" },
  { name: "SmartWorld", file: "SmartWorld.webp" },
  { name: "Sobha Realty", file: "Sobha Realty.webp" },
  { name: "Speed Infra Developers LLP", file: "Speed Infra Developers LLP.webp" },
  { name: "Square Yards", file: "Square Yards.webp" },
  { name: "Tata Housing", file: "Tata Housing.webp" },
  { name: "Unity Group", file: "Unity Group.webp" },
]

export function clientLogoSrc(file: string): string {
  return encodeURI(`${import.meta.env.BASE_URL}Clients Logos/${file}`)
}
