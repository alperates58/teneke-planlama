'use client';

import React from 'react';

export interface FormFieldProps {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const EnterpriseFormField: React.FC<FormFieldProps> = ({
  label,
  id,
  error,
  hint,
  required,
  children,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        {hint && <span className="text-[11px] text-slate-500 font-normal">{hint}</span>}
      </div>
      {children}
      {error && (
        <span id={id ? `${id}-error` : undefined} className="text-xs text-rose-400 font-medium" role="alert">
          {error}
        </span>
      )}
    </div>
  );
};
