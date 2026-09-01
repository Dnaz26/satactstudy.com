import { BrandMark } from '@/components/brand'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 play-dots" />
      <div className="relative mb-8">
        <BrandMark />
      </div>
      <div className="relative w-full max-w-md neu p-8">
        {children}
      </div>
    </div>
  )
}
