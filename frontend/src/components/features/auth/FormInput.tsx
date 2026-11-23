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
        <label
          className="block text-pw-ink mb-1.5"
          style={{ fontSize: '13px' }}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            className="w-full h-12 px-4 bg-white border border-pw-line rounded-xl focus:outline-none focus:ring-2 focus:ring-pw-primary focus:border-pw-primary transition-colors text-pw-ink placeholder:text-pw-faint"
            style={{ paddingRight: right ? '3.5rem' : undefined, ...style }}
            {...props}
          />
          {right && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {right}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-pw-danger" style={{ fontSize: '12px' }}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormInput.displayName = 'FormInput';
