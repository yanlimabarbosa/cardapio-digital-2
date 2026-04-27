'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PhoneStep } from './phone-step';
import { RegisterStep } from './register-step';
import { LoginStep } from './login-step';
import { useCustomerStore } from '@/stores/customer-store';

type Step = 'phone' | 'register' | 'login';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const setCustomer = useCustomerStore((s) => s.setCustomer);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setStep('phone');
      setPhone('');
    }, 200);
  }, [onOpenChange]);

  const handleAuthenticated = useCallback(
    (token: string, customer: { name: string; phone: string; hasPassword: boolean; loyaltyPoints: number }) => {
      setCustomer(token, customer);
      handleClose();
    },
    [setCustomer, handleClose],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent open={open} className="p-0">
        <DialogTitle className="sr-only">Entrar ou Cadastrar</DialogTitle>
        <div className="p-6">
          {step === 'phone' && (
            <PhoneStep
              onNewPhone={(p) => {
                setPhone(p);
                setStep('register');
              }}
              onExistingWithPassword={(p) => {
                setPhone(p);
                setStep('login');
              }}
              onAuthenticated={handleAuthenticated}
            />
          )}
          {step === 'register' && (
            <RegisterStep
              phone={phone}
              onBack={() => setStep('phone')}
              onSuccess={handleAuthenticated}
            />
          )}
          {step === 'login' && (
            <LoginStep
              phone={phone}
              onBack={() => setStep('phone')}
              onSuccess={handleAuthenticated}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
