import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

export function QtyStepper({ value, onChange, size = 'md' }: { value: number; onChange: (next: number) => void; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm'
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-coal p-1 text-white">
      <button type="button" aria-label="-" onClick={() => onChange(value - 1)} className={`flex ${box} cursor-pointer items-center justify-center rounded-full border-none bg-white/10 text-white transition hover:bg-white/20`}>
        <MinusOutlined />
      </button>
      <span className="min-w-5 text-center text-sm font-bold">{value}</span>
      <button type="button" aria-label="+" onClick={() => onChange(value + 1)} className={`flex ${box} cursor-pointer items-center justify-center rounded-full border-none bg-brand text-white transition hover:bg-brand-dark`}>
        <PlusOutlined />
      </button>
    </div>
  )
}
