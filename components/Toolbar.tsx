import React from 'react';
import { ChartConfig } from '../types';

interface ToolbarProps {
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  onTimeframeChange: (timeframe: string) => void;
  timeframe: string;
  onClearDrawings?: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ 
  config, 
  onConfigChange, 
  onTimeframeChange, 
  timeframe,
  onClearDrawings
}) => {
  const updateConfig = (updates: Partial<ChartConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-left">
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
      </div>

      <div className="toolbar-right">
        {onClearDrawings && (
          <button 
            className="clear-btn"
            onClick={onClearDrawings}
          >
            Clear
          </button>
        )}
        
        <div className="theme-selector">
          <button
            className={`theme-btn ${config.theme === 'light' ? 'active' : ''}`}
            onClick={() => updateConfig({ theme: 'light' })}
            title="Light theme"
          >
            ☀️
          </button>
          <button
            className={`theme-btn ${config.theme === 'dark' ? 'active' : ''}`}
            onClick={() => updateConfig({ theme: 'dark' })}
            title="Dark theme"
          >
            🌙
          </button>
        </div>
      </div>

      <style jsx>{`
        .toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 8px 0;
          border-bottom: 1px solid ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
        }
        
        .toolbar-left,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .timeframe-selector {
          display: flex;
          gap: 4px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          padding: 4px;
          border-radius: 6px;
        }
        
        .timeframe-btn {
          padding: 6px 12px;
          border: none;
          background: transparent;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          color: ${config.theme === 'dark' ? '#9CA3AF' : '#6B7280'};
          transition: all 0.2s ease;
        }
        
        .timeframe-btn:hover {
          background: ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
          color: ${config.theme === 'dark' ? '#FFFFFF' : '#374151'};
        }
        
        .timeframe-btn.active {
          background: ${config.theme === 'dark' ? '#3B82F6' : '#2563EB'};
          color: white;
        }
        
        .theme-selector {
          display: flex;
          gap: 4px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          padding: 4px;
          border-radius: 6px;
        }
        
        .theme-btn {
          padding: 6px 10px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .theme-btn:hover {
          background: ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
        }
        
        .theme-btn.active {
          background: ${config.theme === 'dark' ? '#334158' : '#D1D5DB'};
        }
        
        .clear-btn {
          padding: 6px 12px;
          border: none;
          background: ${config.theme === 'dark' ? '#EF4444' : '#DC2626'};
          color: white;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        
        .clear-btn:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default Toolbar;