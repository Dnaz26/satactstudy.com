'use client'

import { PracticeSessionPage } from '@/components/practice/practice-session'
import { BrandMark } from '@/components/brand'
import Link from 'next/link'

export default function OnboardingPracticePage() {
  return (
    <div className="min-h-screen px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <BrandMark href="/onboarding?phase=practice" />
        <Link href="/onboarding?phase=tutor" className="text-sm text-fog hover:text-paper">
          Skip to tutor
        </Link>
      </div>
      <PracticeSessionPage />
    </div>
  )
}
