import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { ServiceCategory } from '@/types/supplier'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlaceResult {
  name: string
  address: string
  phone?: string
  website?: string
  rating?: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractCity(address: string): string {
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p !== 'South Africa' && !/^\d{4}$/.test(p))
  return parts[parts.length - 1] ?? ''
}

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="flex items-center gap-0.5 text-amber-400">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i < full ? 'fill-current' : i === full && half ? 'fill-current opacity-50' : 'fill-current opacity-20'}`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-gray-600 font-medium">{rating.toFixed(1)}</span>
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FindSuppliers() {
  const navigate = useNavigate()

  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [location, setLocation] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    supabase
      .from('service_categories')
      .select('id, name, slug, is_active')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        if (data) setCategories(data as ServiceCategory[])
      })
  }, [])

  async function handleSearch() {
    if (!selectedCategory) {
      toast.error('Please select a service category')
      return
    }
    if (!location.trim()) {
      toast.error('Please enter a location')
      return
    }

    const cat = categories.find((c) => c.slug === selectedCategory)
    const query = `${cat?.name ?? selectedCategory} in ${location.trim()}, South Africa`

    setSearching(true)
    setHasSearched(false)
    setResults([])

    try {
      const key = import.meta.env.VITE_GOOGLE_PLACES_KEY as string
      const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask':
            'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.rating',
        },
        body: JSON.stringify({ textQuery: query }),
      })

      if (!res.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err: any = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message ?? `HTTP ${res.status}`)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: { places?: any[] } = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const places: PlaceResult[] = (data.places ?? []).map((p: any) => ({
        name: p.displayName?.text ?? 'Unknown',
        address: p.formattedAddress ?? '',
        phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber,
        website: p.websiteUri,
        rating: typeof p.rating === 'number' ? p.rating : undefined,
      }))

      setResults(places)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
      setHasSearched(true)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleSave(place: PlaceResult) {
    const params = new URLSearchParams()
    params.set('business_name', place.name)
    if (place.phone) params.set('cell_number', place.phone)
    const city = extractCity(place.address)
    if (city) params.set('city', city)
    params.set('service_category', selectedCategory)
    navigate(`/suppliers/new?${params.toString()}`)
  }

  const inputCls =
    'w-full rounded-lg border border-gray-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition'

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find Suppliers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Search Google for businesses in South Africa and save them to your supplier database.
        </p>
      </div>

      {/* Search panel */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {/* Service category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Service category <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={inputCls}
            >
              <option value="">Select a category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Cape Town, Johannesburg, Durban…"
              className={inputCls}
            />
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={searching}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {searching ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </>
          )}
        </button>
      </section>

      {/* Results */}
      {hasSearched && (
        <>
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 font-medium">No results found</p>
              <p className="text-sm text-gray-400 mt-1">Try a different category or location.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-3">
                Found <span className="font-medium text-gray-800">{results.length}</span> result{results.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {results.map((place, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                  >
                    {/* Info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="font-semibold text-gray-900 leading-snug">{place.name}</p>

                      {place.rating !== undefined && <StarRating rating={place.rating} />}

                      {place.address && (
                        <div className="flex items-start gap-1.5 text-sm text-gray-500">
                          <svg className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{place.address}</span>
                        </div>
                      )}

                      {place.phone && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{place.phone}</span>
                        </div>
                      )}

                      {place.website && (
                        <div className="flex items-center gap-1.5 text-sm">
                          <svg className="w-4 h-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <a
                            href={place.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-700 hover:underline truncate max-w-xs"
                          >
                            {place.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Save button */}
                    <div className="shrink-0">
                      <button
                        onClick={() => handleSave(place)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-teal-600 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors whitespace-nowrap"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Save to Database
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
