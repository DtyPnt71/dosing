import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({
  className,
  children,
  title,
  description,
  preventAutoFocus = false,
  dismissible = true,
}: React.PropsWithChildren<{ className?: string; title: string; description?: string; preventAutoFocus?: boolean; dismissible?: boolean }>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/78 backdrop-blur-sm data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        onEscapeKeyDown={dismissible ? undefined : (event) => event.preventDefault()}
        onInteractOutside={dismissible ? undefined : (event) => event.preventDefault()}
        onOpenAutoFocus={preventAutoFocus ? (event) => event.preventDefault() : undefined}
        className={cn(
          'dialog-sheet fixed z-50 flex max-h-[88dvh] flex-col overflow-hidden border border-slate-200 bg-white shadow-2xl outline-none',
          'inset-x-0 bottom-0 rounded-t-[1.75rem] pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,34rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.5rem]',
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <DialogPrimitive.Title className="text-lg font-bold text-slate-900">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-sm leading-5 text-slate-600">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {dismissible && <DialogPrimitive.Close className="grid size-11 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60" aria-label="Schließen">
            <X className="size-5" />
          </DialogPrimitive.Close>}
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
