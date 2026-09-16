import type { Metadata } from 'next'
import { Outfit, Nunito, IBM_Plex_Mono } from 'next/font/google'
import { CANONICAL_SITE_URL } from '@/lib/utils'
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
  metadataBase: new URL(CANONICAL_SITE_URL),
  title: 'Prep SAT ACT — Study the way you actually learn',
  description:
    'Personalized SAT and ACT practice with Nova. Custom examples, a live score range, a nightly plan, Desmos shortcuts, Rapid Fire, and tutoring — from $10/month.',
  alternates: {
    canonical: '/',
  },
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
