import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'placeholder:text-ink-3 selection:bg-accent selection:text-accent-ink border-line h-auto w-full min-w-0 rounded-[14px] border bg-canvas px-[14px] py-3 text-[15px] text-ink outline-none transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:border-accent focus-visible:bg-surface',
        'aria-invalid:border-danger aria-invalid:bg-danger-soft',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
