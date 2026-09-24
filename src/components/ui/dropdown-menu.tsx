import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { Check } from 'lucide-react'
import { cn } from '../../lib/utils'

export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

export function DropdownMenuContent({ className, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align="end"
        sideOffset={8}
        className={cn('z-50 min-w-64 rounded-2xl border border-slate-200 bg-white/98 p-2 text-slate-800 shadow-2xl backdrop-blur-xl outline-none', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuLabel({ className, ...props }: DropdownMenuPrimitive.DropdownMenuLabelProps) {
  return <DropdownMenuPrimitive.Label className={cn('px-3 pb-1 pt-2 text-[.68rem] font-bold uppercase tracking-[.16em] text-slate-500', className)} {...props} />
}

export function DropdownMenuItem({ className, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps) {
  return <DropdownMenuPrimitive.Item className={cn('flex min-h-11 cursor-default select-none items-center gap-3 rounded-xl px-3 text-sm outline-none data-[highlighted]:bg-cyan-300/10 data-[highlighted]:text-cyan-100', className)} {...props} />
}

export function DropdownMenuCheckboxItem({ children, checked, className, ...props }: DropdownMenuPrimitive.DropdownMenuCheckboxItemProps) {
  return (
    <DropdownMenuPrimitive.CheckboxItem checked={checked} className={cn('relative flex min-h-11 cursor-default select-none items-center rounded-xl px-3 pr-9 text-sm outline-none data-[highlighted]:bg-cyan-300/10', className)} {...props}>
      {children}
      <DropdownMenuPrimitive.ItemIndicator className="absolute right-3"><Check className="size-4 text-cyan-300" /></DropdownMenuPrimitive.ItemIndicator>
    </DropdownMenuPrimitive.CheckboxItem>
  )
}

export const DropdownMenuSeparator = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuSeparatorProps) => (
  <DropdownMenuPrimitive.Separator className={cn('my-2 h-px bg-slate-200', className)} {...props} />
)
