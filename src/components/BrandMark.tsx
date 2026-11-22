/** Castling mark: a rook and king side by side, the two pieces that move in castling. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="brand-mark" width={size} height={size} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M5.5 9.5h1.9v1.8h1.3V9.5h1.6v1.8h1.3V9.5h1.9v4.1l-1.2 1.1v7.6l1.4 1.6v1.3H5.3v-1.3l1.4-1.6v-7.6L5.5 13.6z" />
      <rect x="4.6" y="26.2" width="9.3" height="1.6" rx="0.4" />
      <path d="M21.6 2.2h1.6v1.7h1.7v1.5h-1.7v1.9h-1.6V5.4h-1.7V3.9h1.7z" />
      <path d="M18 8.4c1.4-.5 2.9-.8 4.4-.8s3 .3 4.4.8l-1.8 4.9-.8.9h-3.6l-.8-.9z" />
      <path d="M19.9 14.6h5l-0.6 1.1v6.4l1.6 1.9v1.3h-7v-1.3l1.6-1.9v-6.4z" />
      <rect x="17.8" y="26.2" width="9.2" height="1.6" rx="0.4" />
    </svg>
  )
}
