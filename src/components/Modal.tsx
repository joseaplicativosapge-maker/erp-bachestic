import React from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(' ');

interface ModalProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  onClose: () => void;
  isOpen: boolean;
  maxWidth?: string;
}

export default function Modal({ children, title, subtitle, onClose, isOpen, maxWidth = 'max-w-4xl' }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className={cn(
              'w-full bg-background rounded-[40px] shadow-2xl overflow-hidden flex flex-col my-auto border border-border-custom',
              maxWidth,
            )}
          >
            <div className="p-8 border-b border-border-custom flex items-center justify-between bg-surface shrink-0">
              <div>
                <h3 className="text-2xl font-black tracking-tighter uppercase text-foreground-main">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-foreground-muted text-[10px] font-bold uppercase tracking-widest mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-surface-hover rounded-2xl transition-all text-foreground-muted hover:text-foreground-main"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar max-h-[70vh]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}