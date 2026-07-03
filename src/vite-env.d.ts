/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Production bulk-import server, e.g. https://import.yoursite.com */
  readonly VITE_BULK_IMPORT_API_URL?: string
  /** Production Authyo relay, e.g. https://import.yoursite.com/api/authyo/send-otp */
  readonly VITE_AUTHYO_RELAY_URL?: string
  /** Set to true on production deploy to block copy, right-click, and devtools shortcuts */
  readonly VITE_IS_PRODUCTION?: string
  /** Optional override for /admin gate password (default: nsv@1234 when VITE_IS_PRODUCTION is true) */
  readonly VITE_ADMIN_GATE_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
