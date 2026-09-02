import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string; // default 'max-w-lg'
  glowColor?: 'amber' | 'emerald' | 'blue' | 'purple' | 'red' | 'none';
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  closeButtonClassName?: string;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  noPadding?: boolean;
  customCard?: boolean;
  zIndex?: string;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-lg',
  glowColor = 'amber',
  showCloseButton = true,
  className = '',
  contentClassName = '',
  closeButtonClassName = '',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  noPadding = false,
  customCard = false,
  zIndex = 'z-50',
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow || 'unset';
      };
    }
  }, [isOpen]);

  // Handle ESC key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEsc && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, handleKeyDown]);

  if (typeof window === 'undefined') return null;

  const glowElements = {
    amber: (
      <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 rounded-3xl blur-2xl pointer-events-none" />
    ),
    emerald: (
      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-emerald-500/20 rounded-3xl blur-2xl pointer-events-none" />
    ),
    blue: (
      <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/10 to-blue-500/20 rounded-3xl blur-2xl pointer-events-none" />
    ),
    purple: (
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-indigo-500/10 to-purple-500/20 rounded-3xl blur-2xl pointer-events-none" />
    ),
    red: (
      <div className="absolute -inset-1 bg-gradient-to-r from-red-500/20 via-rose-500/10 to-red-500/20 rounded-3xl blur-2xl pointer-events-none" />
    ),
    none: null,
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className={`fixed inset-0 ${zIndex} flex items-center justify-center overflow-y-auto p-4 sm:p-6 md:p-8`}
        >
          {/* Фоновый оверлей с глубоким размытием */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeOnBackdropClick ? onClose : undefined}
            className="fixed inset-0 bg-black/80 backdrop-blur-xl transition-all"
          />

          {/* Контейнер модального окна */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
            className={`relative w-full ${maxWidth} my-auto z-10 ${className}`}
          >
            {/* Атмосферное фоновое неоновое свечение */}
            {glowElements[glowColor]}

            {/* Тело модалки */}
            {customCard ? (
              <div className={`relative ${contentClassName}`}>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer z-30 ${closeButtonClassName}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {children}
              </div>
            ) : (
              <div
                className={`relative rounded-2xl bg-[#0e0e11]/95 border border-amber-500/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md max-h-[88vh] overflow-y-auto custom-scrollbar ${
                  noPadding ? 'p-0' : 'p-5 sm:p-6'
                } ${contentClassName}`}
              >
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Закрыть"
                    className={`absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer z-20 ${closeButtonClassName}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {children}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default BaseModal;
