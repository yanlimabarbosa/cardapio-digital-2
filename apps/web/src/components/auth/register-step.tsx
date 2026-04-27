'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCustomerRegister } from '@/hooks/customer/use-customer-register';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface RegisterStepProps {
  phone: string;
  onBack: () => void;
  onSuccess: (token: string, customer: { name: string; phone: string; hasPassword: boolean; loyaltyPoints: number }) => void;
}

export function RegisterStep({ phone, onBack, onSuccess }: RegisterStepProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const register = useCustomerRegister();

  const isValid = name.trim().length >= 2 && password.length >= 6 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    if (password !== confirmPassword) {
      setError('As senhas nao coincidem');
      return;
    }

    try {
      const result = await register.mutateAsync({ phone, name: name.trim(), password });
      onSuccess(result.token, result.customer);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
            Faltam algumas informacoes
          </h2>
          <p className="mt-1 text-sm text-terra-800/60">
            Voce so precisa preencher estes dados uma vez
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-terra-700">Telefone</label>
        <Input value={phone} disabled className="bg-terra-50" />
      </div>

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-terra-700">
          Seu nome *
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome completo"
          autoFocus
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-terra-800/60">
          Escolha uma senha. Ela sera usada para garantir que so voce tera acesso a suas informacoes e beneficios
        </p>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-terra-700">
          Senha *
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimo 6 caracteres"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-terra-700">
          Confirmar Senha *
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="mt-1 text-xs text-red-500">As senhas nao coincidem</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!isValid || register.isPending}
        className="w-full bg-terra-600 text-white hover:bg-terra-700"
      >
        {register.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRMAR'}
      </Button>
    </form>
  );
}
