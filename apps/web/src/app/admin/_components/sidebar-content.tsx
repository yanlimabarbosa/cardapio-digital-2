'use client';

import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink } from './nav-link';
import type { NavItem } from './nav-link';

interface SidebarContentProps {
  navItems: NavItem[];
  pathname: string;
  user: { name: string } | null;
  onLogout: () => void;
  onNavClick?: () => void;
}

export function SidebarContent({ navItems, pathname, user, onLogout, onNavClick }: SidebarContentProps) {
  return (
    <>
      <div className="border-b border-[#EAD8A0] p-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Bem Comer Self-Service"
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[#6B3E14]/10"
          />
          <div className="min-w-0">
            <h1 className="font-display text-[1rem] font-semibold text-[#2A1508] truncate">
              Bem Comer Self-Service
            </h1>
            <p className="text-xs text-[#8A6F40] truncate">{user?.name}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onNavClick} />
        ))}
      </nav>

      <div className="border-t border-[#EAD8A0] p-3">
        <motion.button
          whileHover={{ x: 2 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold text-[#8A6F40] transition-colors hover:bg-red-50 hover:text-red-600"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </motion.button>
      </div>
    </>
  );
}
