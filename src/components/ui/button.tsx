import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.985]',
  {
    variants: {
      variant: {
        primary: 'bg-[#087f96] text-white shadow-[0_10px_28px_rgba(8,127,150,.18)] hover:bg-[#066b80]',
        secondary: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-[#38aabd] hover:bg-[#eefafd]',
        ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
        danger: 'bg-red-50 text-red-700 hover:bg-red-100',
      },
      size: {
        default: 'min-h-12 px-5',
        sm: 'min-h-10 px-3',
        icon: 'size-12 shrink-0 px-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'
