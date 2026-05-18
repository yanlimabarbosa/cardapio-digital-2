'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { DatePicker } from '@/components/ui/date-picker';
import { CustomSelect } from '@/components/ui/custom-select';
import type { CouponResponse } from '@cardapio/shared';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

interface CouponForm {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  maxDiscount: string;
  minOrderAmount: string;
  minQuantity: string;
  validFrom: string;
  validUntil: string;
  validDays: number[];
  validTimeFrom: string;
  validTimeTo: string;
  maxUses: string;
  maxUsesPerCustomer: string;
  firstOrderOnly: boolean;
  excludePromotional: boolean;
  deliveryTypeRestriction: string;
  isActive: boolean;
}

function toForm(c: CouponResponse | null): CouponForm {
  if (!c)
    return {
      code: '',
      discountType: 'percentage',
      discountValue: '',
      maxDiscount: '',
      minOrderAmount: '',
      minQuantity: '',
      validFrom: '',
      validUntil: '',
      validDays: [],
      validTimeFrom: '',
      validTimeTo: '',
      maxUses: '',
      maxUsesPerCustomer: '',
      firstOrderOnly: false,
      excludePromotional: false,
      deliveryTypeRestriction: '',
      isActive: true,
    };
  return {
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    maxDiscount: c.maxDiscount != null ? String(c.maxDiscount) : '',
    minOrderAmount: c.minOrderAmount > 0 ? String(c.minOrderAmount) : '',
    minQuantity: c.minQuantity > 0 ? String(c.minQuantity) : '',
    validFrom: c.validFrom ? c.validFrom.slice(0, 10) : '',
    validUntil: c.validUntil ? c.validUntil.slice(0, 10) : '',
    validDays: c.validDays ?? [],
    validTimeFrom: c.validTimeFrom ?? '',
    validTimeTo: c.validTimeTo ?? '',
    maxUses: c.maxUses > 0 ? String(c.maxUses) : '',
    maxUsesPerCustomer: c.maxUsesPerCustomer > 0 ? String(c.maxUsesPerCustomer) : '',
    firstOrderOnly: c.firstOrderOnly,
    excludePromotional: c.excludePromotional,
    deliveryTypeRestriction: c.deliveryTypeRestriction ?? '',
    isActive: c.isActive,
  };
}

function toPayload(f: CouponForm) {
  return {
    code: f.code.trim(),
    discountType: f.discountType,
    discountValue: parseFloat(f.discountValue) || 0,
    maxDiscount: f.maxDiscount ? parseFloat(f.maxDiscount) : null,
    minOrderAmount: f.minOrderAmount ? parseFloat(f.minOrderAmount) : 0,
    minQuantity: f.minQuantity ? parseInt(f.minQuantity, 10) : 0,
    validFrom: f.validFrom || null,
    validUntil: f.validUntil || null,
    validDays: f.validDays.length > 0 ? f.validDays : null,
    validTimeFrom: f.validTimeFrom || null,
    validTimeTo: f.validTimeTo || null,
    maxUses: f.maxUses ? parseInt(f.maxUses, 10) : 0,
    maxUsesPerCustomer: f.maxUsesPerCustomer ? parseInt(f.maxUsesPerCustomer, 10) : 0,
    firstOrderOnly: f.firstOrderOnly,
    excludePromotional: f.excludePromotional,
    deliveryTypeRestriction: f.deliveryTypeRestriction || null,
    isActive: f.isActive,
  };
}

const inputCls =
  'h-10 w-full rounded-lg border border-[#D8C5B2] bg-white px-3 text-sm text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] outline-none placeholder:text-[#8B7355]/50 focus:border-[#A0603A]/45 focus:ring-2 focus:ring-[#A0603A]/20';
const selectCls =
  'border-[#D8C5B2] bg-white text-[#3D2B1F] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(61,43,31,0.04)] focus:ring-[#A0603A]/20';
const labelCls = 'mb-1 block text-xs font-semibold text-[#8B7355]';

interface Props {
  open: boolean;
  coupon: CouponResponse | null;
  onSave: (payload: any) => void;
  onClose: () => void;
  isPending: boolean;
}

export function CouponDialog({ open, coupon, onSave, onClose, isPending }: Props) {
  const [form, setForm] = useState<CouponForm>(() => toForm(coupon));

  useEffect(() => {
    if (open) setForm(toForm(coupon));
  }, [coupon, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.discountValue) return;
    onSave(toPayload(form));
  }

  function toggleDay(day: number) {
    setForm((f) => ({
      ...f,
      validDays: f.validDays.includes(day)
        ? f.validDays.filter((d) => d !== day)
        : [...f.validDays, day].sort(),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent open={open} className="max-w-lg border-[#E8DDD0] bg-[#FFFCF8] p-0">
        <DialogTitle className="sr-only">{coupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
        <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
          <div className="border-b border-[#E8DDD0] px-6 pb-4 pt-6">
            <h2 className="font-display text-lg font-semibold text-[#3D2B1F]">
              {coupon ? 'Editar Cupom' : 'Novo Cupom'}
            </h2>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {/* Code + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Codigo</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DESCONTO10"
                  className={`${inputCls} uppercase`}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Tipo</label>
                <CustomSelect
                  value={form.discountType}
                  onChange={(v) => setForm({ ...form, discountType: v as 'percentage' | 'fixed' })}
                  options={[
                    { value: 'percentage', label: 'Porcentagem (%)' },
                    { value: 'fixed', label: 'Valor fixo (R$)' },
                  ]}
                  className={selectCls}
                />
              </div>
            </div>

            {/* Value + Max discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>
                  Valor {form.discountType === 'percentage' ? '(%)' : '(R$)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  className={inputCls}
                  required
                />
              </div>
              {form.discountType === 'percentage' && (
                <div>
                  <label className={labelCls}>Desconto max. (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maxDiscount}
                    onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                    placeholder="Sem limite"
                    className={inputCls}
                  />
                </div>
              )}
            </div>

            {/* Min order + Min qty */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Pedido min. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Qtd min. itens</label>
                <input
                  type="number"
                  min="0"
                  value={form.minQuantity}
                  onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Valid dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Valido a partir de</label>
                <DatePicker
                  value={form.validFrom}
                  onChange={(v) => setForm({ ...form, validFrom: v })}
                  placeholder="Sem limite"
                  className={selectCls}
                />
              </div>
              <div>
                <label className={labelCls}>Valido ate</label>
                <DatePicker
                  value={form.validUntil}
                  onChange={(v) => setForm({ ...form, validUntil: v })}
                  placeholder="Sem limite"
                  className={selectCls}
                />
              </div>
            </div>

            {/* Time range (text HH:MM) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Horario de</label>
                <input
                  type="text"
                  placeholder="HH:MM"
                  maxLength={5}
                  value={form.validTimeFrom}
                  onChange={(e) => setForm({ ...form, validTimeFrom: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Horario ate</label>
                <input
                  type="text"
                  placeholder="HH:MM"
                  maxLength={5}
                  value={form.validTimeTo}
                  onChange={(e) => setForm({ ...form, validTimeTo: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Valid days */}
            <div>
              <label className={labelCls}>Dias validos</label>
              <div className="flex gap-1.5">
                {DAY_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      form.validDays.includes(i)
                        ? 'bg-terra-600 text-white'
                        : 'border border-[#E8DDD0] text-[#8B7355] hover:border-terra-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-[#8B7355]">Vazio = todos os dias</p>
            </div>

            {/* Usage limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Max usos total</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                  placeholder="Ilimitado"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Max usos por cliente</label>
                <input
                  type="number"
                  min="0"
                  value={form.maxUsesPerCustomer}
                  onChange={(e) => setForm({ ...form, maxUsesPerCustomer: e.target.value })}
                  placeholder="Ilimitado"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Delivery restriction */}
            <div>
              <label className={labelCls}>Restricao de entrega</label>
              <CustomSelect
                value={form.deliveryTypeRestriction}
                onChange={(v) => setForm({ ...form, deliveryTypeRestriction: v })}
                options={[
                  { value: '', label: 'Sem restricao' },
                  { value: 'delivery', label: 'Apenas entrega' },
                  { value: 'pickup', label: 'Apenas retirada' },
                ]}
                placeholder="Sem restricao"
                className={selectCls}
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-2.5">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.firstOrderOnly}
                  onChange={(e) => setForm({ ...form, firstOrderOnly: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E8DDD0] text-terra-600 focus:ring-terra-500"
                />
                <span className="text-sm text-[#3D2B1F]">Apenas primeiro pedido</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.excludePromotional}
                  onChange={(e) => setForm({ ...form, excludePromotional: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E8DDD0] text-terra-600 focus:ring-terra-500"
                />
                <span className="text-sm text-[#3D2B1F]">Excluir itens em promocao</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-[#E8DDD0] text-terra-600 focus:ring-terra-500"
                />
                <span className="text-sm text-[#3D2B1F]">Ativo</span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-[#E8DDD0] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#E8DDD0] px-4 py-2.5 text-sm font-semibold text-[#8B7355] transition-colors hover:bg-[#FAF6F1]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-terra-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-terra-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {coupon ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
