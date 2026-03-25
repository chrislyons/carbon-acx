import type { Metadata } from 'next'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { QueryProvider } from '@/components/providers/QueryProvider'
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
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <QueryProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </QueryProvider>
      </body>
    </html>
  )
}
