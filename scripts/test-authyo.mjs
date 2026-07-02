/**
 * Test Authyo WhatsApp sendotp (uses same client as relay server).
 *
 * Usage:
 *   npm run test:authyo -- 9876543210
 *   npm run test:authyo -- 9876543210 123456
 */
import { sendAuthyoWhatsappOtp } from '../server/lib/authyo-client.mjs'

const phone = process.argv[2] ?? ''
const otp = process.argv[3] ?? '123456'

const clientId = process.env.AUTHYO_CLIENT_ID ?? ''
const clientSecret = process.env.AUTHYO_CLIENT_SECRET ?? ''
const appId = process.env.AUTHYO_APP_ID ?? ''

if (!clientId || !clientSecret) {
  console.error('Set AUTHYO_CLIENT_ID and AUTHYO_CLIENT_SECRET in .env.local')
  process.exit(1)
}

if (!phone) {
  console.error('Usage: npm run test:authyo -- <10-digit-phone> [otp]')
  process.exit(1)
}

const digits = phone.replace(/\D/g, '')
const to = digits.length === 10 ? `91${digits}` : digits

const origin =
  process.env.AUTHYO_AUTHORIZED_ENDPOINT?.trim().replace(/\/$/, '') ||
  'http://localhost:5173'

console.log(`Testing Authyo → ${to} origin=${origin}\n`)

const result = await sendAuthyoWhatsappOtp({
  clientId,
  clientSecret,
  appId,
  to,
  otp,
  origin,
  authWay: 'WhatsApp',
})

if (result.ok) {
  console.log(`✓ Success via ${result.method} origin=${result.origin}`)
  process.exit(0)
}

console.error(`✗ Failed: ${result.error}`)
console.error('\nChecklist:')
console.error('  1. Authyo → Application → Authorized endpoint = http://localhost:5173')
console.error('  2. .env.local has AUTHYO_CLIENT_ID + AUTHYO_CLIENT_SECRET from THAT app')
console.error('  3. npm run dev:all (relay on :3001) when testing in the browser')
process.exit(1)
