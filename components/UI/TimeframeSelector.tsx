import React from 'react';

const timeframes = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' }
];

interface TimeframeSelectorProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  theme: 'light' | 'dark';
}

const TimeframeSelector: React.FC<TimeframeSelectorProps> = ({
  timeframe,
  onTimeframeChange,
  theme,
}) => {
  return (
    <div className="timeframe-selector">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          className={`timeframe-btn ${timeframe === tf.value ? 'active' : ''}`}
          onClick={() => onTimeframeChange(tf.value)}
        >
          {tf.label}
        </button>
      ))}
    </div>
  );
};

export default TimeframeSelector;