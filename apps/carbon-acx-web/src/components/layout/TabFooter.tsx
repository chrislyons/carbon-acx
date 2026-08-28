import type { ReactNode } from 'react'

/**
 * TabFooter — per-tab utility bar, mirroring TabHeader. 54px (var(--bar-h)),
 * sticky above the site footer bottombar. Carries tab-specific actions and
 * status (CTAs, disclaimers, jump links) so content stays framed between the
 * tab headerbar and footerbar, inside the site's header/footer bars.
 */
export function TabFooter({ children }: { children: ReactNode }) {
  return <div className="tab-footerbar">{children}</div>
}
