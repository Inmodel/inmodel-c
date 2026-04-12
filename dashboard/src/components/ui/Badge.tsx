import React from 'react';

interface BadgeProps {
  variant: 'confirmed' | 'pending' | 'scored' | 'minted';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant, children }) => {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
    </span>
  );
};
