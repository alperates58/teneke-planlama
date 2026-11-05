'use client';

import React from 'react';

export interface EnterpriseInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const EnterpriseInput: React.FC<EnterpriseInputProps> = ({
  hasError,
  className = '',
  ...props
}) => {
  return (
    <input
      className={`w-full bg-slate-900 border text-slate-100 placeholder-slate-500 text-xs sm:text-sm rounded px-3 py-1.5 focus:outline-none transition-colors ${
        hasError
          ? 'border-rose-500 focus:border-rose-400'
          : 'border-slate-700 focus:border-sky-500'
      } ${className}`}
      {...props}
    />
  );
};
