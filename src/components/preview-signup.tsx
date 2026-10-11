import Link from 'next/link'

export function PreviewSignup() {
  return (
    <div className="mx-auto flex min-h-[360px] w-full max-w-md flex-col items-center justify-center gap-5 px-6 py-16 text-center">
      <p className="font-display text-3xl text-[#3c3c3c]">Signing up to try more</p>
      <Link
        href="/signup?trial=1"
        className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff5c39] px-8 text-sm font-extrabold text-white shadow-[0_6px_0_#c94424]"
      >
        Sign up
      </Link>
    </div>
  )
}
