import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, ChartNoAxesCombined } from 'lucide-react'
import type { Language, Material, Sample } from '../lib/types'
import { formatPercent } from '../lib/utils'

type Props = { samples: Sample[]; material: Material | null; language: Language }
const valid = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0

export function SampleChart({ samples, material, language }: Props) {
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(600)
  const frame = useRef<HTMLDivElement>(null)
  const id = useId()
  const de = language === 'de'
  const locale = de ? 'de-DE' : 'en-US'
  const fmt = (n: number) => formatPercent(n, locale)
  useEffect(() => {
    if (!visible || !frame.current) return
    const observer = new ResizeObserver(entries => setWidth(Math.max(260, entries[0].contentRect.width)))
    observer.observe(frame.current)
    return () => observer.disconnect()
  }, [visible])
  const low = valid(material?.minPercentB) ? material.minPercentB : null
  const high = valid(material?.maxPercentB) ? material.maxPercentB : null
  const target = valid(material?.targetPercentB) ? material.targetPercentB : low != null && low === high ? low : null
  const band = low != null && high != null && high > low
  const values = samples.map(s => s.value).filter(valid)
  const refs = [low, high, target].filter(valid)
  const extent = [...values, ...refs]
  const minimum = extent.length ? Math.min(...extent) : 0
  const maximum = extent.length ? Math.max(...extent) : 1
  const padding = Math.max((maximum - minimum) * .3, maximum * .015, .1)
  const rawStep = Math.max(maximum - minimum + padding * 2, .5) / 4
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const step = ([1, 2, 2.5, 5, 10].find(n => n * magnitude >= rawStep) ?? 10) * magnitude
  const bottom = Math.max(0, Math.floor((minimum - padding) / step) * step)
  const top = Math.max(bottom + 2 * step, Math.ceil((maximum + padding) / step) * step)
  const ticks = Array.from({ length: Math.round((top - bottom) / step) + 1 }, (_, i) => bottom + i * step)
  const left = 57, right = width - 18, plotTop = 40, plotBottom = 254
  const x = (i: number) => left + (right - left) * (i + .5) / 5
  const y = (n: number) => plotBottom - (n - bottom) / (top - bottom) * (plotBottom - plotTop)
  const outside = (n: number) => (low != null && n < low) || (high != null && n > high)
  const tickFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, notation: top >= 10000 ? 'compact' : 'standard' })
  const title = de ? 'Probenverlauf' : 'Sample trend'

  return <section className="sample-chart-section chart-redesign">
    <button className="chart-disclosure" onClick={() => setVisible(v => !v)} aria-expanded={visible} aria-controls={id}>
      <span className="chart-disclosure-icon"><ChartNoAxesCombined size={22} /></span>
      <span className="chart-disclosure-copy"><strong>{de ? 'Diagramm' : 'Chart'}</strong><small>{visible ? (de ? 'Probenverlauf ausblenden' : 'Hide sample trend') : (de ? 'Probenverlauf anzeigen' : 'Show sample trend')}</small></span>
      <ChevronDown size={22} className={visible ? 'chart-chevron-open' : ''} />
    </button>
    {visible && <div id={id} className="sample-chart-panel">
      <div className="chart-heading"><h3>{title}</h3><span>{de ? 'Dosierung · B bezogen auf A in %' : 'Dosing · B relative to A in %'}</span></div>
      {!!values.length && <div className="chart-summary"><span>{de ? 'Minimum' : 'Minimum'}<strong>{fmt(Math.min(...values))} %</strong></span><span>{de ? 'Maximum' : 'Maximum'}<strong>{fmt(Math.max(...values))} %</strong></span><span>{de ? 'Spannweite' : 'Range'}<strong>{fmt(Math.max(...values) - Math.min(...values))} <small>{de ? 'Prozentpunkte' : 'percentage points'}</small></strong></span></div>}
      <div ref={frame} className="chart-frame">
        <svg className="sample-chart" viewBox={`0 0 ${width} 300`} role="img" aria-labelledby={`${id}-title ${id}-description`}>
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-description`}>{de ? 'Vergrößerter Ausschnitt der Prozentachse. ' : 'Zoomed percentage axis. '}{values.length ? samples.map((s, i) => `${de ? 'Probe' : 'Sample'} ${i + 1}: ${fmt(s.value)} %${outside(s.value) ? de ? ', außerhalb der Vorgabe' : ', outside specification' : ''}`).join('; ') : de ? 'Noch keine Proben.' : 'No samples yet.'}</desc>
          {band && <rect data-chart-band="true" x={left} y={y(high!)} width={right - left} height={y(low!) - y(high!)} fill="#e7f5ef" />}
          {ticks.map((tick, i) => <g key={i}><line x1={left} x2={right} y1={y(tick)} y2={y(tick)} stroke="#e2e8f0" /><text x={left - 10} y={y(tick) + 4} textAnchor="end" className="chart-axis">{tickFormat.format(tick)}</text></g>)}
          {band && [low!, high!].map((v, i) => <line key={i} x1={left} x2={right} y1={y(v)} y2={y(v)} stroke="#16805d" strokeDasharray="5 5" />)}
          {target != null && <line data-chart-target="true" x1={left} x2={right} y1={y(target)} y2={y(target)} stroke="#315b96" strokeDasharray="7 5" strokeWidth="2" />}
          {samples.length > 1 && <polyline points={samples.map((s, i) => `${x(i)},${y(s.value)}`).join(' ')} fill="none" stroke="#52778b" strokeWidth="2" strokeLinejoin="round" />}
          {Array.from({ length: 5 }, (_, i) => {
            const sample = samples[i]
            return <g key={i}>
              {sample && valid(sample.value) ? <>
                {outside(sample.value) ? <path data-chart-point="true" d={`M ${x(i)} ${y(sample.value) - 7} l 7 7 l -7 7 l -7 -7 Z`} fill="#b45309" stroke="white" strokeWidth="2" /> : <circle data-chart-point="true" cx={x(i)} cy={y(sample.value)} r="6" fill="#087f96" stroke="white" strokeWidth="2" />}
                <text x={x(i)} y={y(sample.value) - 15} textAnchor="middle" className="chart-value">{fmt(sample.value)}</text>
              </> : <text x={x(i)} y={plotBottom - 12} textAnchor="middle" className="chart-axis">–</text>}
              <text x={x(i)} y="281" textAnchor="middle" className="chart-axis">{de ? 'Probe' : 'Sample'} {i + 1}</text>
            </g>
          })}
        </svg>
      </div>
      <p className="chart-scale-note">{de ? 'Detailansicht' : 'Detail view'} · {fmt(bottom)}–{fmt(top)} % · {de ? 'Achse automatisch an Messwerte und Vorgabe angepasst.' : 'Axis automatically fitted to measurements and specification.'}</p>
      <div className="chart-legend">
        {target != null && <span><i className="chart-target-key" />{de ? 'Sollwert' : 'Target'}: {fmt(target)} %</span>}
        {band && <span><i className="chart-band-key" />{de ? 'Toleranz' : 'Tolerance'}: {fmt(low!)}–{fmt(high!)} %</span>}
        {low == null && high == null && target == null && <span>{de ? 'Keine Vorgabe hinterlegt.' : 'No specification provided.'}</span>}
        {(low != null || high != null) && <span><i className="chart-diamond-key" />{de ? 'Außerhalb der Vorgabe' : 'Outside specification'}</span>}
      </div>
      {!values.length && <p className="chart-empty">{de ? 'Nach dem Übernehmen erscheint hier die erste Probe.' : 'The first sample appears here after adding it.'}</p>}
    </div>}
  </section>
}
