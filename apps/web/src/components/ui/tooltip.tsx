'use client';

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: string;
  side?: TooltipSide;
  className?: string;
  children: ReactNode;
}

interface TooltipPosition {
  top: number;
  left: number;
  transform: string;
}

const GAP = 8;

const arrowClassBySide: Record<TooltipSide, string> = {
  top: 'left-1/2 top-full -translate-x-1/2 -translate-y-1/2',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2',
  left: 'left-full top-1/2 -translate-x-1/2 -translate-y-1/2',
  right: 'right-full top-1/2 translate-x-1/2 -translate-y-1/2',
};

export function Tooltip({ label, side = 'top', className, children }: TooltipProps) {
  const id = useId();
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    if (side === 'bottom') {
      setPosition({
        top: rect.bottom + GAP,
        left: rect.left + rect.width / 2,
        transform: 'translateX(-50%)',
      });
      return;
    }

    if (side === 'left') {
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.left - GAP,
        transform: 'translate(-100%, -50%)',
      });
      return;
    }

    if (side === 'right') {
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + GAP,
        transform: 'translateY(-50%)',
      });
      return;
    }

    setPosition({
      top: rect.top - GAP,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, -100%)',
    });
  }, [side]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  return (
    <span
      ref={triggerRef}
      className={cn('inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
    >
      {children}
      {mounted && open && position
        ? createPortal(
            <div
              id={id}
              role="tooltip"
              className="pointer-events-none fixed z-[100] max-w-[220px] rounded-md px-2.5 py-1.5 text-center text-[11px] font-medium leading-tight backdrop-blur-md"
              style={{
                top: position.top,
                left: position.left,
                transform: position.transform,
                color: 'rgba(255, 255, 255, 0.96)',
                background: 'rgba(24, 24, 27, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                boxShadow: '0 12px 28px rgba(24, 24, 27, 0.18), 0 2px 8px rgba(24, 24, 27, 0.12)',
              }}
            >
              {label}
              <span
                className={cn(
                  'absolute h-2 w-2 rotate-45 backdrop-blur-md',
                  arrowClassBySide[side],
                )}
                style={{
                  background: 'rgba(24, 24, 27, 0.9)',
                  border: '1px solid rgba(255, 255, 255, 0.16)',
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
