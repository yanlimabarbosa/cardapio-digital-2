'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { open?: boolean }
>(({ className, children, open, ...props }, ref) => (
  <AnimatePresence>
    {open && (
      <DialogPortal forceMount>
        <DialogPrimitive.Overlay forceMount asChild>
          <motion.div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overscroll-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          />
        </DialogPrimitive.Overlay>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <DialogPrimitive.Content forceMount asChild ref={ref} {...props}>
            <motion.div
              className={cn(
                'pointer-events-auto relative flex w-full max-w-lg flex-col rounded-2xl border border-terra-200 bg-white shadow-2xl',
                'max-h-full overflow-hidden overscroll-none',
                className,
              )}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 28, stiffness: 400 } }}
              exit={{ opacity: 0, scale: 0.97, y: 6, transition: { duration: 0.12 } }}
            >
              {children}
              <DialogPrimitive.Close className="absolute right-3 top-3 z-20 rounded-full bg-white/90 p-1.5 shadow-md transition-all hover:bg-white hover:shadow-lg focus:outline-none">
                <X className="h-4 w-4 text-terra-700" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </motion.div>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    )}
  </AnimatePresence>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
