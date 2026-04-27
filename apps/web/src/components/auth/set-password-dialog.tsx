'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCustomerSetPassword } from '@/hooks/customer/use-customer-set-password';
import { useCustomerStore } from '@/stores/customer-store';
import { Loader2 } from 'lucide-react';

interface SetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SetPasswordDialog({ open, onOpenChange }: SetPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setPasswordMutation = useCustomerSetPassword();
  const setHasPassword = useCustomerStore((s) => s.setHasPassword);

  const isValid = password.length >= 6 && password === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setError(null);

    try {
      await setPasswordMutation.mutateAsync(password);
      setHasPassword(true);
      onOpenChange(false);
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message || 'Erro ao definir senha');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="p-0">
        <DialogTitle className="sr-only">Definir senha</DialogTitle>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="text-center">
            <h2 className="font-display text-lg font-semibold text-terra-900">
              Defina sua senha
            </h2>
            <p className="mt-1 text-sm text-terra-800/60">
              Ela protege sua conta e da acesso ao programa de fidelidade
            </p>
          </div>

          <div>
            <label htmlFor="sp-password" className="mb-1 block text-sm font-medium text-terra-700">
              Senha *
            </label>
            <Input
              id="sp-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="sp-confirm" className="mb-1 block text-sm font-medium text-terra-700">
              Confirmar Senha *
            </label>
            <Input
              id="sp-confirm"
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
            disabled={!isValid || setPasswordMutation.isPending}
            className="w-full bg-terra-600 text-white hover:bg-terra-700"
          >
            {setPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'CONFIRMAR'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
