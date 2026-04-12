import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, className = '', ...props }, ref) => {
    return (
      <div className={className}>
        {label && <label className="input-label">{label}</label>}
        <input ref={ref} className="input-field" {...props} />
      </div>
    );
  }
);
Input.displayName = 'Input';
