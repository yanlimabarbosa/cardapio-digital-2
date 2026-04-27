'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock-upgrade';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** CSS classes for the content container */
  className?: string;
  /** Push browser history so back button closes modal (default: true) */
  historyBack?: boolean;
}

export function Modal({ open, onClose, children, className = '', historyBack = true }: ModalProps) {
  const pushedRef = useRef(false);
  const scrollableRef = useRef<HTMLDivElement>(null);

  // Back button closes modal
  useEffect(() => {
    if (!historyBack) return;
    if (open) {
      window.history.pushState({ modal: true }, '');
      pushedRef.current = true;
      const onPopState = () => {
        pushedRef.current = false;
        onClose();
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    } else if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
  }, [open, onClose, historyBack]);

  // ESC closes modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const el = scrollableRef.current;
    if (el) disableBodyScroll(el);
    return () => {
      if (el) enableBodyScroll(el);
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex bg-black/40 md:items-center md:justify-center md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          onClick={onClose}
          aria-hidden="true"
        >
          <motion.div
            ref={scrollableRef}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={`flex h-full w-full flex-col overflow-hidden overscroll-none bg-white md:rounded-2xl md:shadow-2xl ${className}`}
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 30, stiffness: 350 } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' } }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
