'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCustomerLogin } from '@/hooks/customer/use-customer-login';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface LoginStepProps {
  phone: string;
  onBack: () => void;
  onSuccess: (token: string, customer: { name: string; phone: string; hasPassword: boolean; loyaltyPoints: number }) => void;
}

export function LoginStep({ phone, onBack, onSuccess }: LoginStepProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useCustomerLogin();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setError(null);

    try {
      const result = await login.mutateAsync({ phone, password });
      onSuccess(result.token, result.customer);
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 flex items-center gap-1 text-sm text-terra-600 hover:text-terra-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className="text-center">
          <h2 className="font-display text-lg font-semibold text-terra-900">
            Bem-vindo de volta!
          </h2>
          <p className="mt-1 text-sm text-terra-800/60">
            Informe sua senha para continuar
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-terra-700">
          Senha
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!password || login.isPending}
        className="w-full bg-terra-600 text-white hover:bg-terra-700"
      >
        {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ENTRAR'}
      </Button>
    </form>
  );
}
