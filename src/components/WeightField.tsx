type Props = {
  id: string
  label: string
  value: string
  unit: string
  autoFocus?: boolean
  onChange: (value: string) => void
}

export function WeightField({ id, label, value, unit, autoFocus, onChange }: Props) {
  return (
    <label className="weight-field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="weight-input-wrap">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder="0,00"
          onChange={(event) => onChange(event.target.value.replace(/[^0-9.,]/g, ''))}
        />
        <span>{unit}</span>
      </span>
    </label>
  )
}
