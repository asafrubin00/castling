import { useEffect, useRef, type ReactNode } from 'react'

export function RadarDialog({ title, className = '', onClose, children }: {
  title: string
  className?: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    const trigger = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={`radar-dialog ${className}`}
      aria-label={title}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="radar-dialog__body">
        <button type="button" className="radar-close" onClick={onClose} aria-label="Close">Close</button>
        {children}
      </div>
    </dialog>
  )
}
