import type { ReactNode, ButtonHTMLAttributes, Ref } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  tooltip?: string
  ref?: Ref<HTMLButtonElement>
}

export function IconButton({ children, tooltip, className = '', ref, ...props }: IconButtonProps) {
  return (
    <button
      ref={ref}
      title={tooltip}
      className={`no-drag flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
