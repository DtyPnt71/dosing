import { useMemo, useState } from 'react'
import { Check, Search, Star } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from './ui/dialog'
import { cn, formatPercent } from '../lib/utils'
import type { Material } from '../lib/types'

type Props = {
  materials: Material[]
  selectedId: string
  title: string
  searchLabel: string
  emptyLabel: string
  customLabel: string
  locale: string
  onSelect: (material: Material) => void
}

export function MaterialPicker({ materials, selectedId, title, searchLabel, emptyLabel, customLabel, locale, onSelect }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = materials.find((material) => material.id === selectedId)
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale)
    if (!normalized) return materials
    return materials.filter((material) => `${material.name} ${material.id}`.toLocaleLowerCase(locale).includes(normalized))
  }, [materials, query, locale])

  const range = (material: Material) => {
    const min = material.minPercentB
    const max = material.maxPercentB
    if (min == null && max == null) return null
    if (min === max || max == null) return `${formatPercent(min, locale)} %`
    return `${formatPercent(min, locale)}–${formatPercent(max, locale)} %`
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setQuery('') }}>
      <DialogTrigger asChild>
        <button type="button" className="material-trigger" aria-label={title}>
          <span className={cn('truncate', !selected && 'text-slate-500')}>{selected?.name ?? title}</span>
          <span className="material-trigger-meta">
            {selected && range(selected) ? <span>{range(selected)}</span> : null}
            <span aria-hidden="true">›</span>
          </span>
        </button>
      </DialogTrigger>
      <DialogContent title={title} description={`${materials.length} Optionen`} preventAutoFocus>
        <div className="border-b border-slate-200 p-4 sm:px-6">
          <label className="search-field">
            <Search className="size-5 text-slate-500" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchLabel} />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          {filtered.length ? filtered.map((material) => (
            <button
              key={material.id}
              type="button"
              className={cn('material-option', selectedId === material.id && 'is-selected')}
              onClick={() => { onSelect(material); setOpen(false); setQuery('') }}
            >
              <span className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="truncate">{material.name}</span>
                  {material.isCustom ? <Star className="size-3.5 shrink-0 fill-amber-300 text-amber-300" aria-label={customLabel} /> : null}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{range(material) ?? '–'}</span>
              </span>
              {selectedId === material.id ? <Check className="size-5 shrink-0 text-cyan-700" /> : null}
            </button>
          )) : <div className="px-4 py-12 text-center text-sm text-slate-500">{emptyLabel}</div>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
