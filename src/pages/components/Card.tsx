'use client';

import React from 'react';
import { cn } from '@/src/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  noPadding?: boolean;
}

export default function Card({
  children,
  className,
  onClick,
  noPadding = false,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-surface rounded-[32px] border border-border-custom shadow-2xl transition-all duration-300',
        onClick && 'cursor-pointer hover:border-accent/30',
        !noPadding && 'p-8',
        className
      )}
    >
      {children}
    </div>
  );
}