import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Carbon ACX - Trustworthy Carbon Accounting',
  description: 'Open reference stack for carbon accounting with manifest-first architecture, byte hashes, and provenance tracking.',
  keywords: [
    'carbon accounting',
    'emissions tracking',
    'sustainability',
    'provenance',
    'manifest-first',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <QueryProvider>
          <ThemeProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main id="main-content" className="flex-1" role="main">
                {children}
              </main>
              <Footer />
            </div>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  )
}