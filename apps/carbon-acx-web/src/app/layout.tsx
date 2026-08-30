import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Carbon ACX — public carbon literacy',
  description:
    'Trace annual emissions estimates from a published factor through its scope, vintage, method, and source.',
  keywords: ['carbon literacy', 'emissions estimates', 'published factors', 'evidence library'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
        <html lang="en" data-theme="light" suppressHydrationWarning>
          <head>
            <link rel="preload" href="/fonts/GeneralSans-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            <link rel="preload" href="/fonts/CabinetGrotesk-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            <link rel="preload" href="/fonts/JetBrainsMono-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
            <script
              dangerouslySetInnerHTML={{
                __html: `try{var s=localStorage.getItem('carbon-acx-theme');var t=s==='dark'||s==='light'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
              }}
            />
          </head>
          <body className="site-shell-body bg-background text-foreground antialiased">
            <a href="#main-content" className="skip-link">
              Skip to main content
            </a>
            <ThemeProvider>
              <div className="site-shell">
                <Header />
                <main id="main-content" className="site-main" role="main">
                  {children}
                </main>
                <Footer />
              </div>
            </ThemeProvider>
          </body>
        </html>
  )
}