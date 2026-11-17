export type Reverse = { street: string; area?: string; city?: string; label: string }

export type Place = { label: string; detail: string; lat: number; lng: number }

const cache = new Map<string, Reverse>()

export async function reverseGeocode(lat: number, lng: number, lang: 'ar' | 'en', signal?: AbortSignal): Promise<Reverse | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)},${lang}`
  const hit = cache.get(key)
  if (hit) return hit
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=${lang}&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = await res.json()
  const a = data.address ?? {}
  const road = [a.house_number, a.road ?? a.pedestrian ?? a.street].filter(Boolean).join(' ')
  const area = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.city ?? a.town ?? a.state
  const city = a.city ?? a.town ?? a.state ?? a.county
  const street = road || String(data.display_name ?? '').split(',')[0] || ''
  const result: Reverse = { street, area, city, label: [street, area].filter(Boolean).join(' - ') }
  cache.set(key, result)
  return result
}

export async function searchPlaces(query: string, lang: 'ar' | 'en', signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=eg&accept-language=${lang}&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const rows = (await res.json()) as { display_name: string; name?: string; lat: string; lon: string }[]
  return rows.map((r) => {
    const parts = r.display_name.split(',').map((p) => p.trim())
    return { label: r.name || parts[0], detail: parts.slice(1, 4).join('، '), lat: Number(r.lat), lng: Number(r.lon) }
  })
}

export function currentPosition(timeout = 10_000): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('unsupported'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout, maximumAge: 60_000 },
    )
  })
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}
