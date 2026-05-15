import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerPageProps {
  readonly children: ReactNode;
  readonly className?: string;
}

interface CustomerHeaderProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly backHref?: string;
  readonly showLogo?: boolean;
}

export function CustomerPage({ children, className }: CustomerPageProps) {
  return (
    <main className={cn('min-h-dvh bg-cream-warm', className)}>
      {children}
    </main>
  );
}

export function CustomerHeader({ title, subtitle, backHref, showLogo = true }: CustomerHeaderProps) {
  return (
    <header className="relative overflow-hidden bg-cocoa-noise px-4 pb-5 pt-6 text-cream-100">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 tapioca-grain opacity-45" />
        <div className="absolute inset-x-0 bottom-0 h-px rule-butter" />
      </div>
      <div className="container relative flex min-h-12 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-cream-50 transition-colors hover:bg-white/10"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}
        {showLogo && (
          <Link href="/" className="relative shrink-0" aria-label="Bem Comer Self-Service">
            <div className="absolute inset-0 rounded-full bg-butter-400/25 blur-md" aria-hidden />
            <img
              src="/logo.png"
              alt="Bem Comer Self-Service"
              className="relative block h-10 w-10 rounded-full object-cover ring-2 ring-butter-400/70"
            />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-semibold leading-tight text-cream-50">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm font-semibold text-butter-300/90">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}

export function CustomerHeaderSkeleton() {
  return (
    <header className="relative overflow-hidden bg-cocoa-noise px-4 pb-5 pt-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 tapioca-grain opacity-45" />
        <div className="absolute inset-x-0 bottom-0 h-px rule-butter" />
      </div>
      <div className="container relative flex min-h-12 items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-full bg-white/15" />
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded bg-white/15" />
          <div className="h-3.5 w-28 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </header>
  );
}
