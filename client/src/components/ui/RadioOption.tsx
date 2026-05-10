interface RadioOptionProps {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
}

export function RadioOption({ label, description, checked, onChange }: RadioOptionProps) {
  return (
    <label
      className={`flex items-start p-5 rounded-xl cursor-pointer transition-all border ${
        checked
          ? 'bg-surface-container-high border-primary bg-primary/5'
          : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <div className="shrink-0 mt-0.5 mr-4">
        <span
          className={`material-symbols-outlined ${checked ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          {checked ? 'radio_button_checked' : 'radio_button_unchecked'}
        </span>
      </div>
      <div>
        <h4
          className={`font-headline text-base font-semibold mb-1 ${checked ? 'text-primary' : 'text-on-surface'}`}
        >
          {label}
        </h4>
        {description ? (
          <p className="font-body text-xs text-on-surface-variant">{description}</p>
        ) : null}
      </div>
    </label>
  )
}
