'use client';

import { forwardRef } from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  right?: React.ReactNode;
  error?: string;
};

export const FormInput = forwardRef<HTMLInputElement, Props>(
  ({ label, right, error, style, ...props }, ref) => {
    return (
      <div>
        <label className="block text-[#2D2A26] mb-1.5" style={{ fontSize: '13px' }}>
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className="w-full h-12 px-4 bg-white border border-[#E6DFD3] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5E86AD] focus:border-[#5E86AD] transition-colors text-[#2D2A26] placeholder:text-[#A39B8D]"
            style={{ paddingRight: right ? '3.5rem' : undefined, ...style }}
            {...props}
          />
          {right && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{right}</div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-[#C4534E]" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
