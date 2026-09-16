import type { Metadata } from 'next'
import { ResearchDataSheet } from '@/components/landing/research-data-sheet'

export const metadata: Metadata = { title: 'Research Data — Prep SAT ACT', description: 'The complete 243-row synthetic model behind the landing-page research charts.' }

export default function ResearchDataPage() {
  return <ResearchDataSheet />
}
