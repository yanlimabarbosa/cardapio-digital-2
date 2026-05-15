'use client';

import { useEffect, useState } from 'react';
import { Award, CheckCircle2, Gift, History, Lock, Loader2, MinusCircle, PlusCircle, ShoppingBag, User } from 'lucide-react';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { SetPasswordDialog } from '@/components/auth/set-password-dialog';
import { CustomerHeader, CustomerPage } from '@/components/customer/customer-page-shell';
import { useLoyalty } from '@/hooks/customer/use-loyalty';
import { useRedeemableProducts } from '@/hooks/customer/use-redeemable-products';
import { useCustomerStore } from '@/stores/customer-store';
import { formatCurrency } from '@/lib/utils';
import { getImageUrl } from '@/lib/admin-api';
import type { LucideIcon } from 'lucide-react';

const TYPE_META = {
  earn: { label: 'Ganhou', icon: PlusCircle, className: 'text-green-600 bg-green-50' },
  redeem: { label: 'Resgatou', icon: MinusCircle, className: 'text-terra-600 bg-terra-50' },
  adjustment: { label: 'Ajuste', icon: CheckCircle2, className: 'text-blue-600 bg-blue-50' },
} as const;

export function LoyaltyClient() {
  const customer = useCustomerStore();
  const setLoyaltyPoints = useCustomerStore((s) => s.setLoyaltyPoints);
  const [authOpen, setAuthOpen] = useState(false);
  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const loyalty = useLoyalty(1, 20);
  const redeemable = useRedeemableProducts();

  useEffect(() => {
    if (loyalty.data) {
      setLoyaltyPoints(loyalty.data.balance);
    }
  }, [loyalty.data, setLoyaltyPoints]);

  const balance = loyalty.data?.balance ?? redeemable.data?.balance ?? customer.loyaltyPoints;
  const transactions = loyalty.data?.transactions ?? [];
  const products = redeemable.data?.products ?? [];
  const isLoading = loyalty.isLoading || redeemable.isLoading;

  return (
    <CustomerPage className="pb-10">
      <CustomerHeader title="Programa de fidelidade" backHref="/" />

      <div className="container space-y-5 px-4 py-5">
        {!customer.token ? (
          <section className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terra-100">
              <User className="h-6 w-6 text-terra-600" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-terra-900">Entre na sua conta</h2>
            <p className="mt-1 text-sm text-terra-800/60">Acesse seus pontos, resgates e histórico.</p>
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-terra-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terra-700"
            >
              Entrar / Cadastrar
            </button>
          </section>
        ) : !customer.hasPassword ? (
          <section className="rounded-xl border border-[#E8DDD0] bg-[#FFFCF8] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-terra-100">
              <Lock className="h-6 w-6 text-terra-600" />
            </div>
            <h2 className="mt-4 font-display text-lg font-semibold text-terra-900">Defina uma senha</h2>
            <p className="mt-1 text-sm text-terra-800/60">A senha libera seu histórico completo e os resgates por pontos.</p>
            <button
              type="button"
              onClick={() => setSetPasswordOpen(true)}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-terra-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-terra-700"
            >
              Definir senha
            </button>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-xl border border-[#E8DDD0] bg-[#FFFCF8]">
              <div className="bg-cocoa-noise p-5 text-cream-50">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-butter-300">Saldo atual</p>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-display text-4xl font-bold">{balance}</span>
                      <span className="text-sm font-semibold text-butter-200">pontos</span>
                    </div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                    <Award className="h-8 w-8 text-butter-300" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-[#E8DDD0]">
                <div className="p-4">
                  <p className="text-xs text-terra-800/50">Produtos disponíveis</p>
                  <p className="mt-1 font-display text-xl font-semibold text-terra-900">{products.length}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-terra-800/50">Movimentações</p>
                  <p className="mt-1 font-display text-xl font-semibold text-terra-900">{loyalty.data?.total ?? 0}</p>
                </div>
              </div>
            </section>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-terra-600" />
              </div>
            ) : (
              <>
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-terra-600" />
                    <h2 className="font-display text-lg font-semibold text-terra-900">Resgates</h2>
                  </div>
                  {products.length === 0 ? (
                    <EmptyState icon={Gift} title="Nenhum produto para resgate" />
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {products.map((product) => {
                        const imgSrc = getImageUrl(product.imageUrl);
                        return (
                          <div key={product.id} className={`flex gap-3 rounded-xl border bg-white p-3 ${product.canRedeem ? 'border-[#E8DDD0]' : 'border-terra-200 opacity-60'}`}>
                            {imgSrc ? (
                              <img src={imgSrc} alt={product.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-terra-100">
                                <ShoppingBag className="h-6 w-6 text-terra-400" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-semibold text-terra-900">{product.name}</h3>
                              <p className="mt-0.5 text-xs text-terra-800/50">{formatCurrency(product.price)}</p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-sm font-bold text-terra-700">{product.redemptionCost} pts</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${product.canRedeem ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                  {product.canRedeem ? 'Disponível' : 'Faltam pontos'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-terra-600" />
                    <h2 className="font-display text-lg font-semibold text-terra-900">Histórico</h2>
                  </div>
                  {transactions.length === 0 ? (
                    <EmptyState icon={History} title="Nenhuma movimentação ainda" />
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-[#E8DDD0] bg-white">
                      {transactions.map((tx) => {
                        const meta = TYPE_META[tx.type];
                        const Icon = meta.icon;
                        return (
                          <div key={tx.id} className="flex items-center gap-3 border-b border-[#E8DDD0] p-4 last:border-b-0">
                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-terra-900">{tx.description || meta.label}</p>
                              <p className="text-xs text-terra-800/50">
                                {new Date(tx.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </p>
                            </div>
                            <span className={`shrink-0 font-display text-base font-bold ${tx.points >= 0 ? 'text-green-600' : 'text-terra-600'}`}>
                              {tx.points > 0 ? '+' : ''}{tx.points}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </div>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      <SetPasswordDialog open={setPasswordOpen} onOpenChange={setSetPasswordOpen} />
    </CustomerPage>
  );
}

function EmptyState({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="rounded-xl border border-[#E8DDD0] bg-white p-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-terra-300" />
      <p className="mt-2 text-sm font-medium text-terra-800/60">{title}</p>
    </div>
  );
}
