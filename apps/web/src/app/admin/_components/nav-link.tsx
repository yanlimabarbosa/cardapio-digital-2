'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavLinkProps {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}

export function NavLink({ item, pathname, onClick }: NavLinkProps) {
  const isActive = pathname === item.href;
  return (
    <Link href={item.href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(
          'flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-[#F3E9DE] text-[#4A2810] shadow-[inset_3px_0_0_#4A2810]'
            : 'text-[#7A624C] hover:bg-[#FAF6F1] hover:text-[#4A2810]',
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </motion.div>
    </Link>
  );
}
