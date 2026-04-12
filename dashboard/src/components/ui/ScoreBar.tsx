import React from 'react';

interface ScoreBarProps {
  label: string;
  score: number;
  max?: number;
}

export const ScoreBar: React.FC<ScoreBarProps> = ({ label, score, max = 10 }) => {
  return (
    <div>
      <div className="score-bar-row">
        <span className="score-bar-label">{label}</span>
        <span className="score-bar-value">{score}/{max}</span>
      </div>
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${(score / max) * 100}%` }} />
      </div>
    </div>
  );
};
