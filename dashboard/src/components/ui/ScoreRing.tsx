import React from 'react';

interface ScoreRingProps {
  score: number;
  max?: number;
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ score, max = 100, size = 120 }) => {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = (score / max) * circumference;

  const color = score >= 70 ? 'var(--green-base)'
              : score >= 50 ? 'var(--amber-base)'
              : 'var(--red-base)';

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke="var(--bg-border)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={radius}
        fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circumference}
        strokeDashoffset={circumference - fill}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: 'center',
          fontFamily: 'var(--font-data)',
          fill: color,
          fontSize: size * 0.22,
          fontWeight: 700
        }}>
        {score}
      </text>
    </svg>
  );
};
