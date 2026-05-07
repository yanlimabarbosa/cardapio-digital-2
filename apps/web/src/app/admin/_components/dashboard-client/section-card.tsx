'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function SectionCard({
  title,
  children,
  className,
  delay = 0,
}: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', damping: 24, stiffness: 300 }}
      className={cn(
        'rounded-2xl border border-[#E8DDD0] bg-[#FFFCF8] p-5 shadow-[0_0_8px_rgba(61,43,31,0.12)]',
        className,
      )}
    >
      <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#8B7355]">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}
