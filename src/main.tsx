import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/plus-jakarta-sans/wght.css'
import './index.css'
import Root from './Root.tsx'
import { captureRecoveryFromUrl } from './lib/authRecovery'

// Must run before the Supabase client is created — it consumes the URL tokens.
captureRecoveryFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
