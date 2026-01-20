'use client';

import React from 'react';
import clsx from 'clsx';
import { ButtonProps } from '@/types/components';

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className,
}) => {
  const baseStyles =
    'font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:shadow-inner';

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-primary to-primary-dark text-secondary shadow-[0_10px_30px_rgba(247,168,0,0.35)] hover:brightness-105 disabled:bg-gray-400 disabled:shadow-none',
    secondary:
      'bg-gradient-to-r from-secondary to-secondary/90 text-white shadow-[0_10px_30px_rgba(13,19,33,0.35)] hover:brightness-110 disabled:bg-gray-400 disabled:shadow-none',
    outline:
      'border-2 border-primary text-primary hover:bg-primary/10 disabled:border-gray-300 disabled:text-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400',
    ghost:
      'text-secondary hover:bg-gray-100 border border-transparent hover:border-gray-200 disabled:text-gray-400',
  };

  const sizeStyles = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={clsx(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        (disabled || loading) && 'cursor-not-allowed opacity-60',
        className
      )}
    >
      {loading && (
        <span
          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};
