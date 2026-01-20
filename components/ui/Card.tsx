'use client';

import React from 'react';
import clsx from 'clsx';
import { CardProps } from '@/types/components';

export const Card: React.FC<CardProps> = ({ children, className, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'glass-panel rounded-2xl border border-white/60 shadow-sm hover:shadow-lg transition-all',
        onClick && 'cursor-pointer hover:border-primary/40',
        className
      )}
    >
      {children}
    </div>
  );
};
