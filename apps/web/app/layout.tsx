import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono, Fraunces } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  weight: ['400', '600'],
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'Bite — QR Table-Side Ordering for Restaurants',
  description:
    'Customers scan, order, and pay — all from their phone. No app download. No waiting. Just faster tables and happier guests.',
  keywords: ['QR ordering', 'restaurant technology', 'table-side ordering', 'digital menu'],
  openGraph: {
    title: 'Bite — QR Table-Side Ordering for Restaurants',
    description:
      'Customers scan, order, and pay — all from their phone. No app download. No waiting.',
    type: 'website',
    siteName: 'Bite',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bite — QR Table-Side Ordering for Restaurants',
    description:
      'Customers scan, order, and pay — all from their phone. No app download. No waiting.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${jetbrainsMono.variable} ${fraunces.variable}`}
    >
      <body className={`${dmSans.className} bg-bg text-ink antialiased`}>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: '#1A1816',
              color: '#F5F4F1',
              fontFamily: 'DM Sans, sans-serif',
              borderRadius: '10px',
            },
          }}
        />
      </body>
    </html>
  )
}
