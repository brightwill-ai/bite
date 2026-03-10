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
  title: 'Menu — Bite',
  description: 'Order from your table',
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
      <body className={`${dmSans.className} antialiased`}>
        <div className="min-h-screen bg-[#D8D5D0] flex items-start justify-center">
          <div className="w-full max-w-[430px] min-h-screen bg-bg relative overflow-hidden">
            {children}
          </div>
        </div>
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
