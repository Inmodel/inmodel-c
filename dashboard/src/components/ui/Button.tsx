import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', className = '', children, ...props }) => {
  const baseClass = variant === 'ghost' ? 'btn-ghost' : 'btn-primary';
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
};
