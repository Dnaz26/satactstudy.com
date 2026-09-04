import type { DesmosAPI } from '@/types/desmos'

const DESMOS_API_VERSION = 'v1.12'
const SCRIPT_ID = 'desmos-calculator-api'

let loadPromise: Promise<DesmosAPI> | null = null

export function getDesmosApiKey(): string {
  return process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim() ?? ''
}

export function prefetchDesmos(): void {
  if (typeof window === 'undefined') return
  if (window.Desmos || document.getElementById(SCRIPT_ID)) return
  const key = getDesmosApiKey()
  if (!key) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'script'
  link.href = `https://www.desmos.com/api/${DESMOS_API_VERSION}/calculator.js?apiKey=${encodeURIComponent(key)}`
  document.head.appendChild(link)
}

export function loadDesmos(): Promise<DesmosAPI> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Desmos can only load in the browser'))
  }

  if (window.Desmos) return Promise.resolve(window.Desmos)
  if (loadPromise) return loadPromise

  const apiKey = getDesmosApiKey()
  if (!apiKey) {
    return Promise.reject(new Error('Desmos API key is not configured'))
  }

  loadPromise = new Promise<DesmosAPI>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Desmos) resolve(window.Desmos)
        else reject(new Error('Desmos loaded without API'))
      })
      existing.addEventListener('error', () => reject(new Error('Desmos script failed to load')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.async = true
    script.src = `https://www.desmos.com/api/${DESMOS_API_VERSION}/calculator.js?apiKey=${encodeURIComponent(apiKey)}`
    script.onload = () => {
      if (window.Desmos) resolve(window.Desmos)
      else {
        loadPromise = null
        reject(new Error('Desmos loaded without API'))
      }
    }
    script.onerror = () => {
      loadPromise = null
      script.remove()
      reject(new Error('Desmos script failed to load'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
