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
      <body className="antialiased min-h-screen flex flex-col">
        <QueryProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  )
}
