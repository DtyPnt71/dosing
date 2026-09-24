export type Family = 'PU' | 'PS' | 'SI'

export type Material = {
  id: string
  name: string
  minPercentB: number | null
  maxPercentB: number | null
  targetPercentB?: number | null
  isCustom?: boolean
}

export type MaterialMap = Record<Family, Material[]>

export type Sample = {
  id: string
  value: number
  createdAt: number
}

export type DoseStatus = 'ok' | 'low' | 'high' | 'neutral'

export type Language = 'de' | 'en'
