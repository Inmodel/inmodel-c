import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, delta, className = '' }) => {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {delta && <div className="stat-delta">{delta}</div>}
    </div>
  );
};
