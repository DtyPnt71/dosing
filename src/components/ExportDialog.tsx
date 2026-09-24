import { useMemo, useState } from 'react'
import { FileDown, Mail, ShieldCheck } from 'lucide-react'
import { Dialog, DialogContent } from './ui/dialog'
import { Button } from './ui/button'
import { formatPercent, formatToday } from '../lib/utils'
import type { Family, Language, Material, Sample } from '../lib/types'
import type { MessageKey } from '../lib/i18n'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: Language
  family: Family
  material: Material | null
  samples: Sample[]
  mean: number | null
  creators: string[]
  t: (key: MessageKey) => string
}

type Form = {
  machine: string; date: string; customer: string; creator: string; otherCreator: string; comment: string;
  batchEnabled: boolean; batchA: string; batchB: string
}

const defaultForm = (): Form => ({ machine: '', date: formatToday(), customer: '', creator: '', otherCreator: '', comment: '', batchEnabled: false, batchA: '', batchB: '' })

export function ExportDialog({ open, onOpenChange, language, family, material, samples, mean, creators, t }: Props) {
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState<Form>(defaultForm)
  const locale = language === 'de' ? 'de-DE' : 'en-US'
  const creator = form.creator === '__other__' ? form.otherCreator.trim() : form.creator
  const range = useMemo(() => {
    if (!material || material.minPercentB == null) return '–'
    if (material.maxPercentB == null || material.minPercentB === material.maxPercentB) return `${formatPercent(material.minPercentB, locale)} %`
    return `${formatPercent(material.minPercentB, locale)}–${formatPercent(material.maxPercentB, locale)} %`
  }, [material, locale])

  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) { setPin(''); setPinError(false); setUnlocked(false); setBusy(false); setForm(defaultForm()) }
  }

  const unlock = () => {
    if (pin === '4711') { setUnlocked(true); setPinError(false) }
    else setPinError(true)
  }

  const buildReportNode = () => {
    const node = document.createElement('div')
    node.style.cssText = 'width:190mm;min-height:270mm;padding:14mm;background:#fff;color:#17202a;font-family:Arial,sans-serif;font-size:12px;box-sizing:border-box;'
    const rows = samples.map((sample, index) => `<tr><td style="padding:8px;border-bottom:1px solid #dbe3e8">${index + 1}</td><td style="padding:8px;border-bottom:1px solid #dbe3e8;text-align:right;font-weight:700">${formatPercent(sample.value, locale)} %</td></tr>`).join('')
    const escape = (value: string) => value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!)
    node.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #19a9bd;padding-bottom:12px;margin-bottom:20px">
        <img src="${new URL('./logo.png', window.location.href).href}" style="width:150px;height:auto" />
        <div style="font-size:20px;font-weight:800">Dosierbericht</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px"><tbody>
        <tr><td style="padding:5px 0;color:#667784">Datum</td><td style="font-weight:700">${escape(form.date)}</td><td style="color:#667784">Maschinen-Nr.</td><td style="font-weight:700">${escape(form.machine || '–')}</td></tr>
        <tr><td style="padding:5px 0;color:#667784">Materialsorte</td><td style="font-weight:700">${family}</td><td style="color:#667784">Materialtyp</td><td style="font-weight:700">${escape(material?.name ?? '–')}</td></tr>
        <tr><td style="padding:5px 0;color:#667784">Kunde</td><td style="font-weight:700">${escape(form.customer || '–')}</td><td style="color:#667784">Vorgabe</td><td style="font-weight:700">${range}</td></tr>
      </tbody></table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:22px"><thead><tr style="background:#eef5f7"><th style="padding:9px;text-align:left">Probe</th><th style="padding:9px;text-align:right">Ergebnis</th></tr></thead><tbody>${rows}</tbody></table>
      <div style="display:flex;justify-content:space-between;background:#e9f8fa;border:1px solid #a9e2e8;padding:14px 16px;border-radius:10px;font-size:16px"><strong>Mittelwert</strong><strong>${formatPercent(mean, locale)} %</strong></div>
      ${form.batchEnabled ? `<div style="margin-top:20px"><strong>Material-Charge</strong><p>A: ${escape(form.batchA || '–')}<br/>B: ${escape(form.batchB || '–')}</p></div>` : ''}
      ${form.comment ? `<div style="margin-top:20px"><strong>Kommentar</strong><p style="white-space:pre-wrap">${escape(form.comment)}</p></div>` : ''}
      <div style="margin-top:28px;padding-top:12px;border-top:1px solid #dbe3e8;color:#667784">Erstellt durch: ${escape(creator || '–')} · HDT Hochdruck-Dosier-Technik GmbH</div>`
    document.body.appendChild(node)
    return node
  }

  const createPdf = async () => {
    if (!window.html2pdf) return
    setBusy(true)
    const node = buildReportNode()
    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      await Promise.all(Array.from(node.querySelectorAll('img')).map((image) => image.complete ? Promise.resolve() : new Promise<void>((resolve) => { image.onload = () => resolve(); image.onerror = () => resolve() })))
      const worker = window.html2pdf().from(node).set({ margin: [8, 8, 10, 8], image: { type: 'png', quality: 1 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).toPdf()
      const blob = await worker.outputPdf('blob')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Mischungsverhaeltnis_${form.machine || 'Bericht'}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } finally {
      node.remove()
      setBusy(false)
    }
  }

  const sendEmail = () => {
    const lines = [`HDT Dosierbericht`, `${family} · ${material?.name ?? '–'}`, `Vorgabe: ${range}`, '', ...samples.map((sample, index) => `Probe ${index + 1}: ${formatPercent(sample.value, locale)} %`), '', `Mittelwert: ${formatPercent(mean, locale)} %`, `Maschine: ${form.machine || '–'}`, `Erstellt durch: ${creator || '–'}`]
    window.location.href = `mailto:${encodeURIComponent('info@h-d-tec.de')}?subject=${encodeURIComponent('Mischungsverhältnis Bericht')}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={t('exportTitle')} description={material?.name ?? ''}>
        {!unlocked ? (
          <div className="p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-slate-700"><ShieldCheck className="size-5 shrink-0 text-cyan-700" />Interne Berichtsfunktion</div>
            <label className="form-field"><span>{t('exportPin')}</span><input type="password" inputMode="numeric" value={pin} onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setPinError(false) }} onKeyDown={(e) => e.key === 'Enter' && unlock()} autoFocus /></label>
            {pinError ? <p className="mt-2 text-sm text-red-700">{t('wrongPin')}</p> : null}
            <Button className="mt-5 w-full" onClick={unlock}>{t('continue')}</Button>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="form-grid">
                <label className="form-field"><span>{t('machine')}</span><input value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} autoFocus /></label>
                <label className="form-field"><span>{t('date')}</span><input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
                <label className="form-field"><span>{t('customer')}</span><input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} /></label>
                <label className="form-field"><span>{t('creator')}</span><select value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })}><option value="">Bitte wählen</option>{creators.map((name) => <option key={name} value={name}>{name}</option>)}<option value="__other__">Andere …</option></select></label>
                {form.creator === '__other__' ? <label className="form-field"><span>{t('otherCreator')}</span><input value={form.otherCreator} onChange={(e) => setForm({ ...form, otherCreator: e.target.value })} /></label> : null}
                <label className="form-field form-field-wide"><span>{t('comment')}</span><textarea rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></label>
                <label className="checkbox-row form-field-wide"><input type="checkbox" checked={form.batchEnabled} onChange={(e) => setForm({ ...form, batchEnabled: e.target.checked })} /><span>{t('batch')}</span></label>
                {form.batchEnabled ? <><label className="form-field"><span>{t('batchA')}</span><input value={form.batchA} onChange={(e) => setForm({ ...form, batchA: e.target.value })} /></label><label className="form-field"><span>{t('batchB')}</span><input value={form.batchB} onChange={(e) => setForm({ ...form, batchB: e.target.value })} /></label></> : null}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-4 sm:px-6"><Button variant="secondary" onClick={sendEmail}><Mail className="size-4" />{t('email')}</Button><Button disabled={busy} onClick={createPdf}><FileDown className="size-4" />{busy ? '…' : t('createPdf')}</Button></div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
