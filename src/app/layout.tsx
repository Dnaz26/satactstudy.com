import type { Metadata } from 'next'
import { Outfit, Nunito, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
})

const nunito = Nunito({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['600', '700', '800'],
})

const plex = IBM_Plex_Mono({
  variable: '--font-plex',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'SAT ACT AI — Know exactly what to study',
  description:
    'Know exactly what you are good at, exactly what you are bad at, and exactly what to study next.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${nunito.variable} ${plex.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink text-paper">{children}</body>
    </html>
  )
}
