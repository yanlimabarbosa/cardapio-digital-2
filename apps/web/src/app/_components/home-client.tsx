'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CategoryList } from './category-list';
import { CartFloatingBar } from './cart-floating-bar';
import { useHomePage } from './use-home-page';
import { Clock, ChevronDown, MapPin, PackageCheck, User, LogOut, ChevronRight, Lock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCustomerStore } from '@/stores/customer-store';
import { getImageUrl } from '@/lib/admin-api';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { SetPasswordDialog } from '@/components/auth/set-password-dialog';
import { formatScheduleDayRanges } from '@cardapio/shared';

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function HomeClient() {
  const {
    categories,
    isLoading,
    error,
    storeStatus,
    scheduledFor,
    scheduledForLabel,
    clearScheduledFor,
    hoursOpen,
    toggleHours,
    sections,
  } = useHomePage();
  const [authOpen, setAuthOpen] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const customer = useCustomerStore();

  return (
    <main className="min-h-dvh bg-cream-warm pb-24">
      <header className="relative bg-cocoa-noise px-4 pb-7 pt-8 text-cream-100">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 tapioca-grain opacity-50" />
          <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-butter-400/15 blur-2xl" />
          <div className="absolute -top-8 -left-4 h-24 w-24 rounded-full bg-butter-400/10 blur-xl" />
          <div className="absolute inset-x-0 bottom-0 h-px rule-butter" />
        </div>
        <div className="container relative">
          <div className="flex items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="relative shrink-0">
                <div className="absolute inset-0 rounded-full bg-butter-400/30 blur-md" aria-hidden />
                <img src="/logo.png" alt="Bem Comer Self-Service" className="relative block h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-butter-400/70 sm:h-14 sm:w-14" />
              </div>
              <div className="min-w-0">
                <h1 className="font-logo text-[1.45rem] font-bold leading-[1.02] tracking-tight text-cream-50 sm:text-[1.65rem]">
                  Bem Comer
                  <span className="block text-butter-300 italic font-bold tracking-normal" style={{ fontVariationSettings: "'SOFT' 100, 'WONK' 1" }}>
                    Self-Service
                  </span>
                </h1>
              </div>
            </div>

          </div>
          <div className="mt-3 flex items-center gap-2">
            {storeStatus && (
              <button
                onClick={toggleHours}
                aria-expanded={hoursOpen}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-terra-100 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <span className={`h-2 w-2 rounded-full ${storeStatus.open ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]' : 'bg-red-400'}`} />
                <span>{storeStatus.open ? 'Aberto' : storeStatus.reason}</span>
                <span className="mx-0.5 h-3 w-px bg-white/20" aria-hidden />
                <span className="text-butter-300/90">Horários & endereço</span>
                <motion.span animate={{ rotate: hoursOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-3 w-3" />
                </motion.span>
              </button>
            )}
            <div className="ml-auto">
              {customer.token ? (
                <div className="relative">
                  <button
                    onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                    className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Minha Conta</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {accountMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-terra-200 bg-white py-1.5 shadow-xl">
                        {customer.isAdmin && customer.hasPassword && (
                          <Link
                            href="/admin"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-terra-600 hover:bg-terra-50"
                          >
                            <Shield className="h-4 w-4" />
                            Painel Admin
                          </Link>
                        )}
                        <Link
                          href="/meus-pedidos"
                          onClick={() => setAccountMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-terra-800 hover:bg-terra-50"
                        >
                          <PackageCheck className="h-4 w-4" />
                          Meus Pedidos
                        </Link>
                        {customer.hasPassword ? (
                          <Link
                            href="/fidelidade"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-terra-800 hover:bg-terra-50"
                          >
                            <Lock className="h-4 w-4" />
                            Programa de fidelidade
                          </Link>
                        ) : (
                          <Link
                            href="/fidelidade"
                            onClick={() => setAccountMenuOpen(false)}
                            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-terra-800/50 hover:bg-terra-50"
                          >
                            <Lock className="h-4 w-4" />
                            Programa de fidelidade
                          </Link>
                        )}
                        <div className="my-1 border-t border-terra-100" />
                        <button
                          onClick={() => { customer.clear(); setAccountMenuOpen(false); }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors hover:bg-white/25"
                >
                  <User className="h-3.5 w-3.5" />
                  Entrar
                </button>
              )}
            </div>
          </div>
          <AnimatePresence initial={false}>
            {hoursOpen && (
              <motion.div
                key="hours-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ height: { duration: 0.3, ease: [0.32, 0.72, 0, 1] }, opacity: { duration: 0.2 } }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/10 p-3 text-xs text-terra-100 backdrop-blur-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-butter-300" />
                    <span className="leading-snug">R. Flodoaldo Peixoto Filho, 641 — Planalto Boa Esperança, João Pessoa</span>
                  </div>
                  {storeStatus?.opensAt && (
                    <div className="border-t border-white/10 pt-2">
                      {DAY_NAMES.map((day, i) => {
                        const today = new Date().getDay();
                        const isToday = i === today;
                        return (
                          <div key={i} className={`flex justify-between py-1.5 ${i < 6 ? 'border-b border-white/5' : ''} ${isToday ? 'font-bold text-butter-200' : ''}`}>
                            <span>{day}</span>
                            <span>{formatScheduleDayRanges(storeStatus.weeklySchedule, i as 0 | 1 | 2 | 3 | 4 | 5 | 6)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {storeStatus?.bannerUrl && (
        <img
          src={getImageUrl(storeStatus.bannerUrl) || ''}
          alt=""
          className="h-36 w-full object-cover sm:h-48"
        />
      )}

      {storeStatus && !storeStatus.open && (
        <div className="bg-terra-900 px-4 py-3 text-center text-white">
          <div className="container flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">{storeStatus.reason}</span>
            {storeStatus.opensAt && storeStatus.closesAt && (
              <span className="text-sm opacity-80">
                · Horário: {storeStatus.opensAt} - {storeStatus.closesAt}
              </span>
            )}
          </div>
        </div>
      )}

      {scheduledFor && scheduledForLabel && (
        <div className="bg-cream-100 px-4 py-3 text-center text-cocoa-800">
          <div className="container flex flex-wrap items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-semibold">Pedido agendado para {scheduledForLabel}</span>
            <button
              type="button"
              onClick={clearScheduledFor}
              className="rounded-full border border-cocoa-700/20 px-3 py-1 text-xs font-bold text-cocoa-700 transition-colors hover:bg-white"
            >
              Pedir agora
            </button>
          </div>
        </div>
      )}

      <div className="container px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-terra-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="py-20 text-center text-destructive">
            <p>Erro ao carregar o cardápio.</p>
            <p className="text-sm text-muted-foreground">Tente novamente mais tarde.</p>
          </div>
        )}

        {categories && categories.length > 0 && (
          <CategoryList categories={categories} sections={sections} storeOpen={storeStatus?.open !== false || !!scheduledFor} />
        )}
      </div>

      <CartFloatingBar />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <SetPasswordDialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />
    </main>
  );
}
