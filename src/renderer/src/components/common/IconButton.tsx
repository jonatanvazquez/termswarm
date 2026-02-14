import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  tooltip?: string
}

export function IconButton({ children, tooltip, className = '', ...props }: IconButtonProps) {
  return (
    <button
      title={tooltip}
      className={`no-drag flex h-7 w-7 items-center justify-center rounded text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
