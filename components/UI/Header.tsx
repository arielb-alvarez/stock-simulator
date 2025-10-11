import React, { useState } from 'react';
import { ChartConfig } from '../../types';
import { SunIcon, MoonIcon, ClearIcon } from './../DrawingTools/Icons';
import ConnectionStatus from './ConnectionStatus';

interface HeaderProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  isConnected: boolean;
  onClearDrawings: () => void;
}

const Header: React.FC<HeaderProps> = ({
  timeframe,
  onTimeframeChange,
  config,
  onConfigChange,
  isConnected,
  onClearDrawings,
}) => {
  const [showTimeframes, setShowTimeframes] = useState(false);

  const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  const handleTimeframeSelect = (tf: string) => {
    onTimeframeChange(tf);
    setShowTimeframes(false);
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <h1 className="chart-title">BTC/USDT</h1>
        <div className="status-controls">
          <ConnectionStatus isConnected={isConnected} theme={config.theme} />
          
          {/* Timeframe Dropdown Button */}
          <div className="timeframe-dropdown">
            <button 
              className={`timeframe-btn ${config.theme}`}
              onClick={() => setShowTimeframes(!showTimeframes)}
              title="Select Timeframe"
            >
              {timeframe}
            </button>
            
            {showTimeframes && (
              <div className={`timeframe-menu ${config.theme}`}>
                {availableTimeframes.map((tf) => (
                  <button
                    key={tf}
                    className={`timeframe-option ${tf === timeframe ? 'active' : ''}`}
                    onClick={() => handleTimeframeSelect(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="header-right">
        <button 
          className="clear-btn"
          onClick={onClearDrawings}
          title="Clear Drawings"
        >
          <ClearIcon color="white" />
        </button>
        
        <ThemeSelector config={config} onConfigChange={onConfigChange} />
      </div>

      <style jsx>{`
        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          width: 100%;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .chart-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: bold;
        }

        .status-controls {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timeframe-dropdown {
          position: relative;
          display: inline-block;
        }

        .timeframe-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: 1px solid;
          border-radius: 4px;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .timeframe-btn.light {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: #495057;
        }

        .timeframe-btn.dark {
          background-color: #2a2e39;
          border-color: #40444f;
          color: #e0e0e0;
        }

        .timeframe-btn:hover {
          opacity: 0.8;
        }

        .dropdown-arrow {
          font-size: 0.7rem;
          transition: transform 0.2s ease;
        }

        .dropdown-arrow.open {
          transform: rotate(180deg);
        }

        .timeframe-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          border: 1px solid;
          border-radius: 4px;
          z-index: 1000;
          min-width: 55px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .timeframe-menu.light {
          background-color: #ffffff;
          border-color: #dee2e6;
        }

        .timeframe-menu.dark {
          background-color: #2a2e39;
          border-color: #40444f;
        }

        .timeframe-option {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s ease;
        }

        .timeframe-option.light {
          color: #495057;
        }

        .timeframe-option.light:hover,
        .timeframe-option.light.active {
          background-color: #e9ecef;
        }

        .timeframe-option.dark {
          color: #e0e0e0;
        }

        .timeframe-option.dark:hover,
        .timeframe-option.dark.active {
          background-color: #40444f;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .clear-btn {
          padding: 6px;
          border: none;
          border-radius: 4px;
          background-color: #dc3545;
          color: white;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .clear-btn:hover {
          background-color: #c82333;
        }

        .theme-selector {
          display: flex;
          gap: 4px;
          border: 1px solid;
          border-radius: 4px;
          padding: 2px;
        }

        .theme-selector.light {
          border-color: #dee2e6;
          background-color: #f8f9fa;
        }

        .theme-selector.dark {
          border-color: #40444f;
          background-color: #2a2e39;
        }

        .theme-btn {
          padding: 4px 8px;
          border: none;
          border-radius: 2px;
          background: none;
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .theme-btn.light.active {
          background-color: #ffffff;
        }

        .theme-btn.dark.active {
          background-color: #40444f;
        }

        @media (max-width: 768px) {
          .header-left {
            gap: 12px;
          }
          
          .chart-title {
            font-size: 1.2rem;
          }
          
          .status-controls {
            gap: 8px;
          }
        }
      `}</style>
    </header>
  );
};

const ThemeSelector: React.FC<{ config: ChartConfig; onConfigChange: (config: ChartConfig) => void }> = ({
  config,
  onConfigChange
}) => (
  <div className={`theme-selector ${config.theme}`}>
    <button
      className={`theme-btn ${config.theme} ${config.theme === 'light' ? 'active' : ''}`}
      onClick={() => onConfigChange({ ...config, theme: 'light' })}
      title="Light theme"
    >
      <SunIcon />
    </button>
    <button
      className={`theme-btn ${config.theme} ${config.theme === 'dark' ? 'active' : ''}`}
      onClick={() => onConfigChange({ ...config, theme: 'dark' })}
      title="Dark theme"
    >
      <MoonIcon />
    </button>
  </div>
);

export default Header;