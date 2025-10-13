import React, { useCallback, useState } from 'react';
import { ChartConfig, MovingAverageConfig } from '../../types';
import { SunIcon, MoonIcon, ClearIcon, IndicatorIcon } from './../DrawingTools/Icons';
import ConnectionStatus from './ConnectionStatus';
import MovingAverageConfigDialog from './../Chart/MovingAverageConfigDialog';
import MovingAverageService from '@/services/MovingAverageService';

interface HeaderProps {
  timeframe: string;
  onTimeframeChange: (timeframe: string) => void;
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  isConnected: boolean;
  onClearDrawings: () => void;
  onAddMovingAverage: (config: MovingAverageConfig) => void;
}

const Header: React.FC<HeaderProps> = ({
  timeframe,
  onTimeframeChange,
  config,
  onConfigChange,
  isConnected,
  onClearDrawings,
  onAddMovingAverage,
}) => {
  const [showTimeframes, setShowTimeframes] = useState(false);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showMADialog, setShowMADialog] = useState(false);

  const availableTimeframes = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];
  
  // Available indicators
  const availableIndicators = [
    'Moving Average',
  ];

  const handleTimeframeSelect = (tf: string) => {
    onTimeframeChange(tf);
    setShowTimeframes(false);
  };

  const handleIndicatorSelect = (indicator: string) => {
    if (indicator === 'Moving Average') {
      setShowMADialog(true);
    }
    setShowIndicators(false);
  };

  // Add new moving average globally
  const addMovingAverage = useCallback((config: MovingAverageConfig) => {
      MovingAverageService.addConfig({ ...config, visible: true });
      setShowMADialog(false);
  }, []);

  return (
    <header className="main-header">
      <div className="header-left">
        <h1 className="chart-title">BTC/USDT</h1>
        <div className="status-controls">          
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

          {/* Indicators Dropdown Button */}
          <div className="indicators-dropdown">
            <button 
              className={`indicators-btn ${config.theme}`}
              onClick={() => setShowIndicators(!showIndicators)}
              title="Add Indicators"
            >
              <IndicatorIcon />
              Indicators
            </button>
            
            {showIndicators && (
              <div className={`indicators-menu ${config.theme}`}>
                {availableIndicators.map((indicator) => (
                  <button
                    key={indicator}
                    className="indicator-option"
                    onClick={() => handleIndicatorSelect(indicator)}
                  >
                    {indicator}
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

      {/* Moving Average Configuration Dialog */}
      {showMADialog && (
        <MovingAverageConfigDialog
          onSave={addMovingAverage}
          onClose={() => setShowMADialog(false)}
          theme={config.theme}
          isMobile={false} // You might want to make this dynamic based on screen size
        />
      )}

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

        .timeframe-dropdown,
        .indicators-dropdown {
          position: relative;
          display: inline-block;
        }

        .timeframe-btn,
        .indicators-btn {
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

        .timeframe-btn.light,
        .indicators-btn.light {
          background-color: #f8f9fa;
          border-color: #dee2e6;
          color: #495057;
        }

        .timeframe-btn.dark,
        .indicators-btn.dark {
          background-color: #2a2e39;
          border-color: #40444f;
          color: #e0e0e0;
        }

        .timeframe-btn:hover,
        .indicators-btn:hover {
          opacity: 0.8;
        }

        .timeframe-menu,
        .indicators-menu {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          border: 1px solid;
          border-radius: 4px;
          z-index: 1000;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .timeframe-menu {
          min-width: 55px;
        }

        .indicators-menu {
          min-width: 180px;
          max-height: 300px;
          overflow-y: auto;
        }

        .timeframe-menu.light,
        .indicators-menu.light {
          background-color: #ffffff;
          border-color: #dee2e6;
        }

        .timeframe-menu.dark,
        .indicators-menu.dark {
          background-color: #2a2e39;
          border-color: #40444f;
        }

        .timeframe-option,
        .indicator-option {
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

        .timeframe-option.light,
        .indicator-option.light {
          color: #495057;
        }

        .timeframe-option.light:hover,
        .timeframe-option.light.active,
        .indicator-option.light:hover {
          background-color: #e9ecef;
        }

        .timeframe-option.dark,
        .indicator-option.dark {
          color: #e0e0e0;
        }

        .timeframe-option.dark:hover,
        .timeframe-option.dark.active,
        .indicator-option.dark:hover {
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

          .indicators-btn span {
            display: none;
          }

          .indicators-btn {
            padding: 6px;
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