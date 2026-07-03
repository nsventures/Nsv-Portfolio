import { useEffect } from 'react'

import { attachSiteProtection, isSiteProtectionEnabled } from '../lib/siteProtection'

/** Enables copy / inspect deterrents on the public site when VITE_IS_PRODUCTION is set. */
export function useSiteProtection() {
  useEffect(() => {
    if (!isSiteProtectionEnabled()) return
    return attachSiteProtection()
  }, [])
}
