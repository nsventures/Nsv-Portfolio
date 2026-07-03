const clientId = process.env.AUTHYO_CLIENT_ID ?? ''
const clientSecret = process.env.AUTHYO_CLIENT_SECRET ?? ''
const appId = process.env.AUTHYO_APP_ID ?? ''

const origins = [
  'http://localhost:5173',
  'https://nsv-portfolio.vercel.app',
  'https://nsv-portfolio-five.vercel.app',
  'https://portfolio.nsventures.in',
  'portfolio.nsventures.in',
  'localhost:5173',
]

const url =
  'https://app.authyo.io/api/v1/auth/sendotp?to=919876543210&expiry=300&otpLength=6&authWay=WhatsApp&otp=123456'

console.log(`clientId=${clientId.slice(0, 8)}… appId=${appId || '(not set)'}\n`)

for (const origin of origins) {
  const headers = {
    clientId,
    clientSecret,
    origin,
    Referer: `${origin.startsWith('http') ? origin : `https://${origin}`}/`,
  }
  if (appId) {
    headers.appId = appId
    headers.appid = appId
  }

  const res = await fetch(url, { method: 'GET', headers })
  const raw = await res.text()
  let summary = raw
  try {
    const p = JSON.parse(raw)
    summary = p?.data?.results?.[0]?.message ?? p?.message ?? raw
  } catch {
    // keep raw
  }
  console.log(`${origin} → ${summary}`)
}
