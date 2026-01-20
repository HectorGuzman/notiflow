'use client';

import React from 'react';
import clsx from 'clsx';
import { TextAreaProps } from '@/types/components';

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  placeholder,
  value,
  onChange,
  rows = 4,
  error,
  maxLength,
  disabled,
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        className={clsx(
          'w-full px-4 py-2.5 border rounded-xl font-medium transition-all resize-none backdrop-blur-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm hover:shadow',
          error ? 'border-red-500 bg-red-50' : 'border-white/70 bg-white/80 hover:border-primary/30',
          disabled && 'bg-gray-100 cursor-not-allowed opacity-60 shadow-none'
        )}
      />
      <div className="flex justify-between items-center mt-1">
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {maxLength && (
          <p className="text-gray-500 text-sm ml-auto">
            {value?.length || 0}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
};
