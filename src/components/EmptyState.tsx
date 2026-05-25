import React from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-surface-hover rounded-[40px] border-2 border-dashed border-border-custom">
      <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center text-accent mb-8 animate-pulse">
        <Icon size={48} />
      </div>
      <h3 className="text-2xl font-black text-foreground-main tracking-tight mb-3">{title}</h3>
      <p className="text-foreground-muted text-sm font-medium max-w-md mx-auto mb-10 leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="bg-accent text-white px-10 py-4 rounded-2xl font-black text-xs tracking-widest hover:scale-105 transition-all uppercase shadow-2xl shadow-accent/40 active:scale-95 flex items-center gap-3"
        >
          <Plus size={18} /> {actionLabel}
        </button>
      )}
    </div>
  );
}