'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { maskPhone } from '@/lib/utils';
import { useCustomerIdentify } from '@/hooks/customer/use-customer-identify';
import { Loader2 } from 'lucide-react';

interface PhoneStepProps {
  onNewPhone: (phone: string) => void;
  onExistingWithPassword: (phone: string) => void;
  onAuthenticated: (token: string, customer: { name: string; phone: string; hasPassword: boolean; loyaltyPoints: number }) => void;
}

export function PhoneStep({ onNewPhone, onExistingWithPassword, onAuthenticated }: PhoneStepProps) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const identify = useCustomerIdentify();

  const digits = phone.replace(/\D/g, '');
  const isValid = digits.length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    try {
      const result = await identify.mutateAsync(phone);

      if (result.action === 'register') {
        onNewPhone(phone);
      } else if (result.action === 'login') {
        onExistingWithPassword(phone);
      } else if (result.action === 'authenticated' && result.token && result.customer) {
        onAuthenticated(result.token, result.customer);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar telefone');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center">
        <h2 className="font-display text-lg font-semibold text-terra-900">
          Informe seu numero de telefone
        </h2>
        <p className="mt-1 text-sm text-terra-800/60">
          Ele e importante para falarmos com voce caso necessario
        </p>
      </div>

      <div>
        <label htmlFor="phone" className="mb-1 block text-sm font-medium text-terra-700">
          Telefone
        </label>
        <Input
          id="phone"
          type="tel"
          placeholder="(00) 90000-0000"
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!isValid || identify.isPending}
        className="w-full bg-terra-600 text-white hover:bg-terra-700"
      >
        {identify.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRMAR'}
      </Button>
    </form>
  );
}
