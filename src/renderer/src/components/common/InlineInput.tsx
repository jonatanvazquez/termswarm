import { useState, useRef, useEffect } from 'react'

interface InlineInputProps {
  placeholder: string
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function InlineInput({ placeholder, onSubmit, onCancel }: InlineInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim())
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      placeholder={placeholder}
      className="w-full rounded border border-accent bg-surface-0 px-2 py-1 text-xs text-text-primary outline-none placeholder:text-text-secondary"
    />
  )
}
