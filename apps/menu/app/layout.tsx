import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
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
    <html lang="en" className={`${dmSans.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,300;1,9..144,400;1,9..144,700;1,9..144,900&display=swap"
          rel="stylesheet"
        />
      </head>
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
