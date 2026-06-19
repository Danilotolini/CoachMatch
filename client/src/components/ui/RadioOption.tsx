import { Icon } from '@/components/ui/Icon'

interface RadioOptionProps {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  className?: string
}

export function RadioOption({
  label,
  description,
  checked,
  onChange,
  className = '',
}: RadioOptionProps) {
  return (
    <label
      className={`flex items-start p-5 rounded-xl cursor-pointer transition-all border ${
        checked
          ? 'bg-surface-container-high border-primary'
          : 'bg-surface-container-low border-transparent hover:bg-surface-container-highest'
      } ${className}`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <div className="shrink-0 mt-0.5 mr-4">
        <Icon
          name={checked ? 'radio_button_checked' : 'radio_button_unchecked'}
          className={checked ? 'text-primary' : 'text-on-surface-variant'}
        />
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
