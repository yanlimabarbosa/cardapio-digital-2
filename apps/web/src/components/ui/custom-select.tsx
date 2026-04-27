'use client';

import { useState, useRef, useEffect } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder = 'Selecionar', className }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-lg border border-[#EAD8A0] bg-white px-3 text-sm outline-none transition-colors focus:border-[#D4B878] focus:ring-2 focus:ring-[#EAD8A0]/50',
            !selected && 'text-[#8A6F40]/50',
            className,
          )}
        >
          <span className={selected ? 'text-[#2A1508]' : ''}>{selected?.label || placeholder}</span>
          <ChevronDown className={cn('h-4 w-4 text-[#8A6F40] transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-[100] max-h-[240px] min-w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-xl border border-[#EAD8A0] bg-white py-1 shadow-xl animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          sideOffset={4}
          align="start"
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-terra-50',
                opt.value === value ? 'font-semibold text-terra-600' : 'text-[#2A1508]',
              )}
            >
              {opt.label}
              {opt.value === value && <Check className="h-3.5 w-3.5 text-terra-600" />}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
