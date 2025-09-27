import React, { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

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

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' }
  ];

  const renderTimeframeSelector = () => {
    if (isMobile) {
      return (
        <select
          className="timeframe-dropdown"
          value={timeframe}
          onChange={(e) => onTimeframeChange(e.target.value)}
        >
          {timeframes.map((tf) => (
            <option key={tf.value} value={tf.value}>
              {tf.label}
            </option>
          ))}
        </select>
      );
    }

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

  const renderThemeSelector = () => {
    if (isMobile) {
      return (
        <select
          className="theme-dropdown"
          value={config.theme}
          onChange={(e) => updateConfig({ theme: e.target.value as 'light' | 'dark' })}
        >
          {themes.map((theme) => (
            <option key={theme.value} value={theme.value}>
              {theme.label}
            </option>
          ))}
        </select>
      );
    }

    return (
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
    );
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {renderTimeframeSelector()}
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
        
        {renderThemeSelector()}
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
        
        /* Dropdown styles for mobile */
        .timeframe-dropdown,
        .theme-dropdown {
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          color: ${config.theme === 'dark' ? '#FFFFFF' : '#374151'};
          min-width: 80px;
        }
        
        .theme-dropdown {
          min-width: 100px;
        }
        
        /* Mobile-specific adjustments */
        @media (max-width: 768px) {
          .toolbar {
            padding: 6px 0;
            margin-bottom: 12px;
          }
          
          .toolbar-left,
          .toolbar-right {
            gap: 8px;
          }
          
          .clear-btn {
            padding: 6px 10px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Toolbar;