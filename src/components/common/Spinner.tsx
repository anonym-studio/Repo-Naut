interface Props {
  size?: number
  className?: string
  label?: string
}

export function Spinner({ size = 16, className = '', label }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} role="status" aria-label={label ?? '読み込み中'}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        className="animate-spin text-blue-600"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="text-xs text-gray-500">{label}</span>}
    </span>
  )
}
