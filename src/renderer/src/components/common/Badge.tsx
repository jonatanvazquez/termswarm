export function Badge({ count }: { count: number }) {
  if (count <= 0) return null

  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-medium text-white">
      {count > 99 ? '99+' : count}
    </span>
  )
}
