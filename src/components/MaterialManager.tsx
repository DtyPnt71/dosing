import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent } from './ui/dialog'
import { Button } from './ui/button'
import { parseDecimal, slugify } from '../lib/utils'
import type { Family, Material, MaterialMap } from '../lib/types'
import type { MessageKey } from '../lib/i18n'

type Props = {
  mode: 'add' | 'manage' | null
  customMaterials: MaterialMap
  t: (key: MessageKey) => string
  onClose: () => void
  onSave: (family: Family, material: Material, previous?: { family: Family; id: string }) => void
  onDelete: (family: Family, id: string) => void
}

const emptyForm = { family: 'PS' as Family, id: '', name: '', target: '', min: '', max: '' }

export function MaterialManager({ mode, customMaterials, t, onClose, onSave, onDelete }: Props) {
  const [formOpen, setFormOpen] = useState(false)
  const [previous, setPrevious] = useState<{ family: Family; id: string } | undefined>()
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    if (mode === 'add') {
      setForm(emptyForm)
      setPrevious(undefined)
      setFormOpen(true)
    } else if (!mode) {
      setFormOpen(false)
    }
  }, [mode])

  const count = useMemo(() => Object.values(customMaterials).reduce((sum, list) => sum + list.length, 0), [customMaterials])

  const edit = (family: Family, material: Material) => {
    setPrevious({ family, id: material.id })
    setForm({
      family,
      id: material.id,
      name: material.name,
      target: material.targetPercentB == null ? '' : String(material.targetPercentB),
      min: material.minPercentB == null ? '' : String(material.minPercentB),
      max: material.maxPercentB == null ? '' : String(material.maxPercentB),
    })
    setFormOpen(true)
  }

  const save = () => {
    const name = form.name.trim()
    if (!name) return
    const target = parseDecimal(form.target)
    const min = parseDecimal(form.min)
    const max = parseDecimal(form.max)
    onSave(form.family, {
      id: form.id.trim() || slugify(name),
      name,
      targetPercentB: target,
      minPercentB: min ?? target,
      maxPercentB: max ?? target,
      isCustom: true,
    }, previous)
    setFormOpen(false)
    setPrevious(undefined)
    setForm(emptyForm)
    if (mode === 'add') onClose()
  }

  const formDialogOpen = mode === 'add' ? !!mode : formOpen

  return (
    <>
      <Dialog open={mode === 'manage'} onOpenChange={(open) => !open && onClose()}>
        <DialogContent title={t('manageMaterials')} description={`${count} ${t('custom').toLowerCase()}`}>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {count === 0 ? (
              <div className="empty-panel">{t('noMaterial')}</div>
            ) : (['PU', 'PS', 'SI'] as Family[]).map((family) => customMaterials[family].length ? (
              <section key={family} className="mb-6 last:mb-0">
                <h3 className="mb-2 text-xs font-bold tracking-[.16em] text-slate-500">{family}</h3>
                <div className="space-y-2">
                  {customMaterials[family].map((material) => (
                    <div key={material.id} className="manage-row">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{material.name}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{material.id}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => edit(family, material)} aria-label={t('edit')}><Pencil className="size-4" /></Button>
                      <Button variant="danger" size="icon" onClick={() => onDelete(family, material.id)} aria-label={t('delete')}><Trash2 className="size-4" /></Button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null)}
          </div>
          <div className="border-t border-slate-200 p-4 sm:px-6">
            <Button className="w-full" onClick={() => { setForm(emptyForm); setPrevious(undefined); setFormOpen(true) }}><Plus className="size-4" />{t('addMaterial')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={formDialogOpen} onOpenChange={(open) => { setFormOpen(open); if (!open && mode === 'add') onClose() }}>
        <DialogContent title={previous ? t('edit') : t('addMaterial')}>
          <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
            <div className="form-grid">
              <label className="form-field"><span>Materialsorte</span><select value={form.family} onChange={(e) => setForm({ ...form, family: e.target.value as Family })}><option>PU</option><option>PS</option><option>SI</option></select></label>
              <label className="form-field"><span>{t('materialName')}</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z. B. Emcepren 510" autoFocus /></label>
              <label className="form-field"><span>{t('materialId')}</span><input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} placeholder="emcepren-510" /></label>
              <label className="form-field"><span>{t('targetValue')}</span><input inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} placeholder="10,00" /></label>
              <label className="form-field"><span>{t('minValue')}</span><input inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} placeholder="9,00" /></label>
              <label className="form-field"><span>{t('maxValue')}</span><input inputMode="decimal" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value })} placeholder="11,00" /></label>
            </div>
          </div>
          <div className="flex gap-3 border-t border-slate-200 p-4 sm:px-6"><Button variant="secondary" className="flex-1" onClick={() => { setFormOpen(false); if (mode === 'add') onClose() }}>{t('cancel')}</Button><Button className="flex-1" disabled={!form.name.trim()} onClick={save}>{t('save')}</Button></div>
        </DialogContent>
      </Dialog>
    </>
  )
}
