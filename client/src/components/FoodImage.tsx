import { useState } from 'react'
import { imageUrl } from '../lib/format'

const TONES = ['#212121', '#E53935', '#3E2723', '#BF360C']

function tone(seed: string) {
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TONES[h % TONES.length]
}

export function FoodImage({ src, alt, seed, className = '' }: { src?: string; alt: string; seed: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const url = imageUrl(src)

  if (!url || failed) {
    const bg = tone(seed)
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ background: bg }} role="img" aria-label={alt}>
        <svg viewBox="0 0 64 64" className="h-1/2 max-h-16 w-auto" aria-hidden="true">
          <circle cx="32" cy="34" r="22" fill="none" stroke="#FFC107" strokeWidth="4" />
          <circle cx="32" cy="34" r="13" fill="#FFC107" opacity="0.25" />
          <path d="M20 14v12M24 14v12M28 14v12M20 26c0 4 8 4 8 0M24 26v26M44 14c-5 4-5 14 0 16v22" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    )
  }
  return <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />
}
