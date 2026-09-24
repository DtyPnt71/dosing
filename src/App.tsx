import { useEffect, useMemo, useState } from 'react'
import { Calculator, ChevronRight, CircleHelp, Download, FileDown, Info, Languages, Menu, Plus, RefreshCw, RotateCcw, Scale, Settings2, Trash2, Weight, Wrench } from 'lucide-react'
import baseMaterialsJson from './materials.json'
import creatorsJson from './creator-names.json'
import { Button } from './components/ui/button'
import { Dialog, DialogContent } from './components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu'
import { MaterialPicker } from './components/MaterialPicker'
import { MaterialManager } from './components/MaterialManager'
import { ExportDialog } from './components/ExportDialog'
import { StatusBadge } from './components/StatusBadge'
import { SampleChart } from './components/SampleChart'
import { WeightField } from './components/WeightField'
import { translator } from './lib/i18n'
import { cn, formatPercent, parseDecimal } from './lib/utils'
import type { DoseStatus, Family, Language, Material, MaterialMap, Sample } from './lib/types'

const CUSTOM_MATERIALS_KEY = 'hdt-custom-materials-v3'
const LANGUAGE_KEY = 'hdt-language-v3'
const CURRENT_VERSION = 'v3.3.1'

const familyNames: Record<Family, { de: string; en: string }> = {
  PU: { de: 'Polyurethan', en: 'Polyurethane' },
  PS: { de: 'Polysulfid', en: 'Polysulfide' },
  SI: { de: 'Silikon', en: 'Silicone' },
}

const emptyMaterials = (): MaterialMap => ({ PU: [], PS: [], SI: [] })

function readCustomMaterials(): MaterialMap {
  try {
    const stored = localStorage.getItem(CUSTOM_MATERIALS_KEY) || localStorage.getItem('hdt-custom-materials') || ''
    const parsed = JSON.parse(stored) as Partial<MaterialMap>
    return { PU: parsed.PU ?? [], PS: parsed.PS ?? [], SI: parsed.SI ?? [] }
  } catch {
    return emptyMaterials()
  }
}

function getDoseStatus(value: number | null, material: Material | null): DoseStatus {
  if (value == null || !material || material.minPercentB == null || material.maxPercentB == null) return 'neutral'
  if (value < material.minPercentB) return 'low'
  if (value > material.maxPercentB) return 'high'
  return 'ok'
}

function App() {
  const [language, setLanguage] = useState<Language>(() => ((localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem('hdt-lang')) === 'en' ? 'en' : 'de'))
  const [family, setFamily] = useState<Family>('PS')
  const [materialId, setMaterialId] = useState('')
  const [weightA, setWeightA] = useState('')
  const [weightB, setWeightB] = useState('')
  const [samples, setSamples] = useState<Sample[]>([])
  const [customMaterials, setCustomMaterials] = useState<MaterialMap>(readCustomMaterials)
  const [managerMode, setManagerMode] = useState<'add' | 'manage' | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [infoOpen, setInfoOpen] = useState<'help' | 'calculation' | 'about' | 'imprint' | null>(null)
  const [weightNoticeOpen, setWeightNoticeOpen] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(() => !!window.__HDT_UPDATE_PENDING__)
  const [updatePhase, setUpdatePhase] = useState('')
  const [updateError, setUpdateError] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [bootChecking, setBootChecking] = useState(true)
  const [online, setOnline] = useState(navigator.onLine)
  const [toast, setToast] = useState('')
  const t = translator(language)
  const locale = language === 'de' ? 'de-DE' : 'en-US'

  const baseMaterials = baseMaterialsJson as MaterialMap
  const allMaterials = useMemo<MaterialMap>(() => ({
    PU: [...baseMaterials.PU, ...customMaterials.PU.map((m) => ({ ...m, isCustom: true }))],
    PS: [...baseMaterials.PS, ...customMaterials.PS.map((m) => ({ ...m, isCustom: true }))],
    SI: [...baseMaterials.SI, ...customMaterials.SI.map((m) => ({ ...m, isCustom: true }))],
  }), [baseMaterials, customMaterials])

  const selectedMaterial = allMaterials[family].find((material) => material.id === materialId) ?? null
  const a = parseDecimal(weightA)
  const b = parseDecimal(weightB)
  const liveResult = a != null && b != null && a > 0 && b >= 0 ? (100 * b) / a : null
  const liveStatus = getDoseStatus(liveResult, selectedMaterial)
  const mean = samples.length ? samples.reduce((sum, sample) => sum + sample.value, 0) / samples.length : null
  const meanStatus = getDoseStatus(mean, selectedMaterial)

  const statusLabel = (status: DoseStatus) => t(status)
  const statusHint = (status: DoseStatus) => t(`${status}Hint` as 'okHint' | 'lowHint' | 'highHint' | 'neutralHint')

  const targetRange = (material: Material | null) => {
    if (!material || material.minPercentB == null) return '–'
    if (material.maxPercentB == null || material.minPercentB === material.maxPercentB) return `${formatPercent(material.minPercentB, locale)} %`
    return `${formatPercent(material.minPercentB, locale)}–${formatPercent(material.maxPercentB, locale)} %`
  }

  const checkForUpdate = async (silent = false) => {
    try {
      void window.__HDT_CHECK_SW__?.().catch(() => undefined)
      const response = await fetch(`./version.json?check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const release = await response.json() as { version?: string; maintenance?: boolean }
      setMaintenance(release.maintenance === true)
      if (release.version && release.version !== CURRENT_VERSION) {
        setUpdateAvailable(true)
      } else if (!silent && !window.__HDT_UPDATE_PENDING__) {
        setToast(language === 'de' ? 'Die App ist aktuell.' : 'The app is up to date.')
      }
    } catch {
      if (!silent) setToast(language === 'de' ? 'Updateprüfung derzeit nicht möglich.' : 'Update check is currently unavailable.')
    } finally {
      setBootChecking(false)
    }
  }

  useEffect(() => {
    localStorage.setItem(CUSTOM_MATERIALS_KEY, JSON.stringify(customMaterials))
  }, [customMaterials])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'de' ? 'HDT GmbH Dosier-Tool' : 'HDT GmbH Dosing Tool'
  }, [language])

  useEffect(() => {
    void checkForUpdate(true)
    const onPhase = (event: Event) => setUpdatePhase((event as CustomEvent<string>).detail)
    window.addEventListener('hdt-update-phase', onPhase)
    try {
      const from = sessionStorage.getItem('hdt-updated-from')
      if (from) {
        sessionStorage.removeItem('hdt-updated-from')
        setToast(from !== CURRENT_VERSION ? `${CURRENT_VERSION} – Update erfolgreich` : 'App neu geladen. Versionsstand prüfen.')
      }
    } catch { /* optional feedback */ }
    const handleUpdate = () => setUpdateAvailable(true)
    window.addEventListener('hdt-update-ready', handleUpdate)
    return () => { window.removeEventListener('hdt-update-ready', handleUpdate); window.removeEventListener('hdt-update-phase', onPhase) }
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    if (!toast) return
    const id = window.setTimeout(() => setToast(''), 2400)
    return () => window.clearTimeout(id)
  }, [toast])

  const selectFamily = (next: Family) => {
    if (next === family) return
    if (samples.length) setToast(language === 'de' ? 'Neue Materialsorte: Messreihe zurückgesetzt' : 'New material family: series reset')
    setFamily(next)
    setMaterialId('')
    setSamples([])
    setWeightA('')
    setWeightB('')
  }

  const addSample = () => {
    if (liveResult == null || !selectedMaterial) return
    const sample: Sample = { id: crypto.randomUUID?.() ?? `${Date.now()}`, value: liveResult, createdAt: Date.now() }
    setSamples((current) => [...current.slice(-4), sample])
    setWeightA('')
    setWeightB('')
    setToast(language === 'de' ? 'Probe übernommen' : 'Sample added')
  }

  const saveCustomMaterial = (targetFamily: Family, material: Material, previous?: { family: Family; id: string }) => {
    setCustomMaterials((current) => {
      const next: MaterialMap = { PU: [...current.PU], PS: [...current.PS], SI: [...current.SI] }
      if (previous) next[previous.family] = next[previous.family].filter((item) => item.id !== previous.id)
      next[targetFamily] = [...next[targetFamily].filter((item) => item.id !== material.id), material]
      return next
    })
    setFamily(targetFamily)
    setMaterialId(material.id)
    setSamples([])
    setToast(language === 'de' ? 'Material gespeichert' : 'Material saved')
  }

  const deleteCustomMaterial = (targetFamily: Family, id: string) => {
    setCustomMaterials((current) => ({ ...current, [targetFamily]: current[targetFamily].filter((material) => material.id !== id) }))
    if (family === targetFamily && materialId === id) setMaterialId('')
    setToast(language === 'de' ? 'Material gelöscht' : 'Material deleted')
  }

  const toggleLanguage = () => {
    const next = language === 'de' ? 'en' : 'de'
    setLanguage(next)
    localStorage.setItem(LANGUAGE_KEY, next)
  }

  const selectMaterial = (material: Material) => {
    if (material.id === materialId) return
    if (samples.length) setToast(language === 'de' ? 'Neues Material: Messreihe zurückgesetzt' : 'New material: series reset')
    setMaterialId(material.id)
    setSamples([])
  }

  const canAddSample = selectedMaterial != null && liveResult != null
  const disabledHint = !selectedMaterial ? t('missingMaterial') : liveResult == null ? t('missingValues') : ''

  const installUpdate = async () => {
    if (updatePhase && !updateError) return
    if ((samples.length || weightA || weightB) && !window.confirm(language === 'de' ? 'Beim Aktualisieren wird die aktuelle Messreihe zurückgesetzt. Bericht vorher speichern. Jetzt aktualisieren?' : 'Updating clears the current measurements. Save your report first. Update now?')) return
    try {
      setUpdateError(false)
      setUpdatePhase('download')
      if (!window.__HDT_UPDATE_SW__) throw new Error('Updates unavailable')
      await window.__HDT_UPDATE_SW__(true)
    } catch {
      setUpdateError(true)
    }
  }

  if (bootChecking) {
    return <div className="boot-screen"><img src="./logo.png" alt="HDT GmbH" /><span className="boot-spinner" /><p>{language === 'de' ? 'Dosier-Tool wird geladen …' : 'Loading dosing tool …'}</p></div>
  }

  if (maintenance) {
    return <div className="maintenance-screen"><div className="maintenance-card"><img src="./logo.png" alt="HDT GmbH" /><div className="maintenance-icon"><Wrench /></div><h1>Wartungsarbeiten</h1><p>Das Dosier-Tool wird momentan aktualisiert und steht in Kürze wieder zur Verfügung.</p><p className="maintenance-en">The dosing tool is currently being updated and will be available again shortly.</p><Button onClick={() => window.location.reload()}><RefreshCw className="size-4" />Erneut prüfen</Button></div></div>
  }

  return (
    <div className="app-shell">
      <Dialog open={!!updatePhase} onOpenChange={(open) => { if (!open && updateError) setUpdatePhase('') }}><DialogContent dismissible={updateError} title={language === 'de' ? 'Dosier-Tool aktualisieren' : 'Update dosing tool'} description={language === 'de' ? 'Die App startet anschließend automatisch neu.' : 'The app will restart automatically.'}>
        <div className="update-progress" role="status" aria-live="polite">
          <div className="update-progress-icon"><RefreshCw className={updateError ? '' : 'update-spin'} /></div>
          <h3>{updateError ? (language === 'de' ? 'Update noch nicht abgeschlossen' : 'Update not completed') : updatePhase === 'download' ? (language === 'de' ? 'Update wird vorbereitet …' : 'Preparing update …') : updatePhase === 'activate' ? (language === 'de' ? 'Neue Version wird aktiviert …' : 'Activating new version …') : (language === 'de' ? 'App wird neu gestartet …' : 'Restarting app …')}</h3>
          <p>{updateError ? (language === 'de' ? 'Bitte Verbindung prüfen und erneut versuchen. Deine Eingaben bleiben bis zum Neustart erhalten.' : 'Check your connection and retry. Your entries remain until restart.') : (language === 'de' ? 'Bitte lasse dieses Fenster geöffnet. Sobald die neue Version bereit ist, laden wir die App neu.' : 'Keep this window open. The app reloads once the new version is ready.')}</p>
          {updateError ? <div className="flex justify-center gap-3"><Button variant="secondary" onClick={() => setUpdatePhase('')}>{language === 'de' ? 'Zurück' : 'Back'}</Button><Button onClick={installUpdate}>{language === 'de' ? 'Erneut versuchen' : 'Retry'}</Button></div> : <div className="update-stages"><span className="is-current">{language === 'de' ? 'Vorbereiten' : 'Prepare'}</span><span className={updatePhase !== 'download' ? 'is-current' : ''}>{language === 'de' ? 'Aktivieren' : 'Activate'}</span><span className={updatePhase === 'reload' ? 'is-current' : ''}>{language === 'de' ? 'Neustart' : 'Restart'}</span></div>}
        </div>
      </DialogContent></Dialog>
      <header className="app-header">
        <div className="brand-wrap">
          <img src="./logo.png" className="brand-logo" alt="HDT GmbH" />
          <div className="brand-copy"><h1>{t('title')}</h1><p>{t('subtitle')}</p></div>
        </div>
        <div className="header-actions">
          <Button variant="secondary" size="icon" onClick={() => window.location.reload()} aria-label={language === 'de' ? 'Website neu laden' : 'Reload website'} title={language === 'de' ? 'Website neu laden' : 'Reload website'}><RotateCcw className="size-5" /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="secondary" size="icon" aria-label={t('menu')}><Menu className="size-5" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('menu')}</DropdownMenuLabel>
              <DropdownMenuItem disabled={!samples.length} onSelect={() => setExportOpen(true)}><FileDown className="size-4 text-cyan-700" />{t('export')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={toggleLanguage}><Languages className="size-4" />{t('language')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setManagerMode('add')}><Plus className="size-4" />{t('addMaterial')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setManagerMode('manage')}><Settings2 className="size-4" />{t('manageMaterials')}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setInfoOpen('calculation')}><Calculator className="size-4" />{language === 'de' ? 'Berechnung & Gewicht' : 'Calculation & weight'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void checkForUpdate(false)}><RefreshCw className="size-4" />{language === 'de' ? 'Nach Updates suchen' : 'Check for updates'}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setInfoOpen('help')}><CircleHelp className="size-4" />{t('help')}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setInfoOpen('about')}><Info className="size-4" />{t('about')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {updateAvailable ? <div className="update-banner" role="status"><div><Download /><span><strong>{language === 'de' ? 'Update verfügbar' : 'Update available'}</strong><small>{language === 'de' ? 'Eine neue Version des Dosier-Tools ist bereit.' : 'A new version of the dosing tool is ready.'}</small></span></div><Button size="sm" onClick={installUpdate}>{language === 'de' ? 'Jetzt aktualisieren' : 'Update now'}</Button></div> : null}

      <main>
        <div className="progress-strip" aria-label="Fortschritt">
          <span className={cn(selectedMaterial && 'is-done')}><span>1</span>{t('material')}</span><ChevronRight />
          <span className={cn(a != null && b != null && 'is-done')}><span>2</span>{t('weights')}</span><ChevronRight />
          <span className={cn(samples.length && 'is-done')}><span>3</span>{t('history')}</span>
        </div>

        <section className="tool-card material-card">
          <div className="section-heading"><div className="section-icon"><Settings2 /></div><div><h2>{t('material')}</h2></div></div>
          <div className="family-tabs" role="radiogroup" aria-label="Materialsorte">
            {(['PU', 'PS', 'SI'] as Family[]).map((item) => (
              <button key={item} type="button" role="radio" aria-checked={family === item} className={family === item ? 'is-active' : ''} onClick={() => selectFamily(item)}>
                <strong>{item}</strong><span>{familyNames[item][language]}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <span className="field-label">{language === 'de' ? 'Materialtyp' : 'Material type'}</span>
            <MaterialPicker materials={allMaterials[family]} selectedId={materialId} title={t('selectMaterial')} searchLabel={t('searchMaterial')} emptyLabel={t('noMaterial')} customLabel={t('custom')} locale={locale} onSelect={selectMaterial} />
          </div>
        </section>

        <section className="tool-card weights-card">
          <div className="section-heading"><div className="section-icon"><Weight /></div><div><h2>{t('weights')}</h2></div></div>
          <div className="weights-grid"><WeightField id="weight-a" label={t('weightA')} value={weightA} unit={t('grams')} onChange={setWeightA} /><WeightField id="weight-b" label={t('weightB')} value={weightB} unit={t('grams')} onChange={setWeightB} /></div>
        </section>

        <section className={cn('result-card', liveStatus !== 'neutral' && `result-${liveStatus}`)} aria-live="polite">
          <div className="result-main">
            <div><span className="eyebrow">{t('currentSample')}</span><div className="result-number">{formatPercent(liveResult, locale)}<small>{liveResult == null ? '' : ' %'}</small></div></div>
            <div className="result-status">
              <StatusBadge status={liveStatus} label={!selectedMaterial ? (language === 'de' ? 'Material auswählen' : 'Select material') : liveResult == null ? (language === 'de' ? 'Gewichte eingeben' : 'Enter weights') : statusLabel(liveStatus)} />
              {selectedMaterial ? <p>{t('target')}: <strong>{targetRange(selectedMaterial)}</strong></p> : null}
            </div>
          </div>
          {selectedMaterial && liveResult != null ? <p className="status-hint">{statusHint(liveStatus)}</p> : null}
          <Button className="w-full sm:w-auto" disabled={!canAddSample} onClick={addSample}>{t('addSample')}</Button>
          {!canAddSample ? <p className="disabled-hint">{disabledHint}</p> : null}
        </section>

        <section className="series-card">
          <div className="series-header"><div><h2>{t('history')}</h2><p>{t('maxFive')}</p></div>{samples.length ? <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}><FileDown className="size-4" />{t('export')}</Button> : null}</div>
          {samples.length ? (
            <div className="sample-list">
              {samples.map((sample, index) => (
                <div className="sample-row" key={sample.id}><span className="sample-index">{index + 1}</span><div className="min-w-0 flex-1"><strong>{language === 'de' ? 'Probe' : 'Sample'} {index + 1}</strong><span>{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(sample.createdAt)}</span></div><StatusBadge compact status={getDoseStatus(sample.value, selectedMaterial)} label={formatPercent(sample.value, locale) + ' %'} /><Button variant="ghost" size="icon" className="size-10 min-h-10" onClick={() => setSamples(samples.filter((item) => item.id !== sample.id))} aria-label={t('delete')}><Trash2 className="size-4" /></Button></div>
              ))}
            </div>
          ) : <div className="empty-series"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><p>{t('emptyHistory')}</p></div>}
          <div className="mean-panel"><div><span>{t('mean')}</span><strong>{formatPercent(mean, locale)}{mean == null ? '' : ' %'}</strong></div><StatusBadge status={meanStatus} label={mean == null ? (language === 'de' ? 'Noch keine Messung' : 'No measurements yet') : statusLabel(meanStatus)} /></div>
        </section>
        <SampleChart key={`${family}:${materialId}`} samples={samples} material={selectedMaterial} language={language} />
      </main>

      <footer className="app-footer">
        <button onClick={() => setInfoOpen('imprint')}>Impressum</button><button onClick={() => setInfoOpen('help')}>{t('help')}</button><button onClick={() => setInfoOpen('about')}>{CURRENT_VERSION}</button><span className={online ? 'is-online' : 'is-offline'}><i />{online ? t('online') : t('offline')}</span>
      </footer>

      <MaterialManager mode={managerMode} customMaterials={customMaterials} t={t} onClose={() => setManagerMode(null)} onSave={saveCustomMaterial} onDelete={deleteCustomMaterial} />
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} language={language} family={family} material={selectedMaterial} samples={samples} mean={mean} creators={(creatorsJson as { names: string[] }).names} t={t} />

      <Dialog open={weightNoticeOpen} onOpenChange={setWeightNoticeOpen}><DialogContent title={language === 'de' ? 'Wichtiger Hinweis' : 'Important notice'} description={language === 'de' ? 'Berechnung ausschließlich nach Gewicht' : 'Calculation based on weight only'}><div className="weight-notice"><div className="weight-notice-icon"><Scale /></div><p>{language === 'de' ? <>Dieses Tool berechnet das Mischungsverhältnis ausschließlich anhand der <strong>gewogenen Mengen</strong> von Komponente A und B. Volumenangaben dürfen nicht verwendet werden.</> : <>This tool calculates the mixing ratio exclusively from the <strong>weighed quantities</strong> of components A and B. Do not use volume measurements.</>}</p><Button className="w-full" onClick={() => setWeightNoticeOpen(false)}>{language === 'de' ? 'Verstanden' : 'Understood'}</Button></div></DialogContent></Dialog>

      <Dialog open={infoOpen != null} onOpenChange={(open) => !open && setInfoOpen(null)}><DialogContent title={infoOpen === 'help' ? t('help') : infoOpen === 'calculation' ? (language === 'de' ? 'Berechnung & Gewicht' : 'Calculation & weight') : infoOpen === 'imprint' ? 'Impressum' : t('about')}>
        <div className="prose-panel">
          {infoOpen === 'help' ? <ol><li>{language === 'de' ? 'Materialsorte und Materialtyp auswählen.' : 'Select material family and type.'}</li><li>{language === 'de' ? 'Gewichte von Komponente A und B eingeben.' : 'Enter weights for components A and B.'}</li><li>{language === 'de' ? 'Live-Ergebnis und Toleranz prüfen.' : 'Check live result and tolerance.'}</li><li>{language === 'de' ? 'Probe übernehmen und bis zu fünf Messungen vergleichen.' : 'Add the sample and compare up to five measurements.'}</li></ol> : infoOpen === 'calculation' ? <><div className="calculation-box"><span>B</span><i>÷</i><span>A</span><i>×</i><span>100</span><strong>%</strong></div><p>{t('formula')}</p><p>{language === 'de' ? 'Verwende ausschließlich gewogene Mengen in derselben Einheit. Gramm und Kilogramm dürfen nicht innerhalb einer Berechnung gemischt werden.' : 'Use weighed quantities in the same unit only. Do not mix grams and kilograms within one calculation.'}</p></> : infoOpen === 'imprint' ? <p><strong>HDT Hochdruck-Dosier-Technik GmbH</strong><br />Müllerstraße 7<br />46242 Bottrop<br />Deutschland<br /><br />Telefon: +49 (0) 20 41/10 13 01<br />E-Mail: info@h-d-tec.de</p> : <><p><strong>HDT Dosier-Tool {CURRENT_VERSION}</strong></p><p>Copyright © 2026 Timo Burian.<br />All rights reserved. Built with help of AI.</p><p className="text-slate-500">React· PWA</p></>}
        </div>
      </DialogContent></Dialog>

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </div>
  )
}

export default App
