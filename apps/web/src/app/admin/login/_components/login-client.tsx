'use client';

import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useLoginPage } from './use-login-page';
import { motion } from 'framer-motion';

export function LoginClient() {
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useLoginPage();

  return (
    <main className="admin-shell fixed inset-0 flex items-center justify-center bg-[#FAF6F1] tapioca-grain px-4">
      <div className="pointer-events-none absolute -top-20 -left-20 h-80 w-80 rounded-full bg-[#A0603A]/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#A0603A]/5 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-64 w-64 rounded-full bg-[#A0603A]/3 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        className="relative w-full max-w-sm rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-8 shadow-[0_0_8px_rgba(61,43,31,0.12)]"
      >
        <div className="mb-6 flex flex-col items-center">
          <img
            src="/logo.png"
            alt="Bem Comer Self-Service"
            className="mb-3 h-20 w-20 rounded-full object-cover ring-4 ring-[#A0603A]/10"
          />
          <h1 className="font-display text-2xl font-semibold text-[#3D2B1F]">Admin</h1>
          <p className="text-sm text-[#8B7355]">Bem Comer Self-Service</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">
              E-mail
            </label>
            <Input
              id="email"
              type="email"
              data-testid="admin-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 rounded-xl border-[#E8DDD0] bg-[#FFFCF8] focus-visible:ring-[#A0603A]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-[#8B7355]">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              data-testid="admin-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-11 rounded-xl border-[#E8DDD0] bg-[#FFFCF8] focus-visible:ring-[#A0603A]"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            data-testid="admin-login"
            className="flex h-11 w-full items-center justify-center rounded-xl bg-[#A0603A] text-sm font-bold text-white transition-colors hover:bg-[#8b4c2a] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </motion.button>
        </form>
      </motion.div>
    </main>
  );
}
