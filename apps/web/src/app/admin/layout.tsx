'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { LayoutDashboard, FolderTree, UtensilsCrossed, ClipboardList, Sparkles, MapPin, History, Menu, X, Users, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SidebarContent } from './_components/sidebar-content';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/featured', label: 'Seções', icon: Sparkles },
  { href: '/admin/categories', label: 'Categorias', icon: FolderTree },
  { href: '/admin/products', label: 'Produtos', icon: UtensilsCrossed },
  { href: '/admin/delivery-areas', label: 'Entregas', icon: MapPin },
  { href: '/admin/orders', label: 'Pedidos', icon: ClipboardList },
  { href: '/admin/orders/history', label: 'Histórico', icon: History },
  { href: '/admin/coupons', label: 'Cupons', icon: Tag },
  { href: '/admin/customers', label: 'Clientes', icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, logout } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !token && pathname !== '/admin/login') {
      router.push('/admin/login');
    }
  }, [hydrated, token, pathname, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!hydrated || !token) return null;

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  return (
    <div className="admin-shell flex min-h-dvh">
      <aside className="hidden w-64 flex-col border-r border-[#E8DDD0] bg-[#FFFCF8] md:flex sticky top-0 h-dvh">
        <SidebarContent navItems={NAV_ITEMS} pathname={pathname} user={user} onLogout={handleLogout} />
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-[#E8DDD0] bg-[#FFFCF8] px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-[#3D2B1F] transition-colors hover:bg-[#FAF6F1]"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2">
          <img src="/logo.png" alt="" className="h-7 w-7 rounded-full object-cover" />
          <span className="font-display text-base font-semibold text-[#3D2B1F]">Bem Comer Self-Service</span>
        </div>
        <div className="w-9" />
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-[#FFFCF8] shadow-2xl md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-4 rounded-full p-1.5 text-[#8B7355] hover:bg-[#FAF6F1]"
              >
                <X className="h-4 w-4" />
              </button>
              <SidebarContent
                navItems={NAV_ITEMS}
                pathname={pathname}
                user={user}
                onLogout={handleLogout}
                onNavClick={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 bg-[#FAF6F1] tapioca-grain">
        <div className="p-6 pt-20 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
