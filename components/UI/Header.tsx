import React from 'react';
import { ChartConfig } from '../../types';
import { SunIcon, MoonIcon, ClearIcon } from './../DrawingTools/Icons';
import TimeframeSelector from './TimeframeSelector';
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
  return (
    <header className="main-header">
      <div className="header-left">
        <h1 className="chart-title">BTC/USDT</h1>
        <ConnectionStatus isConnected={isConnected} theme={config.theme} />
      </div>

      <div className="header-center">
        <TimeframeSelector 
          timeframe={timeframe} 
          onTimeframeChange={onTimeframeChange} 
          theme={config.theme} 
        />
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
    </header>
  );
};

const ThemeSelector: React.FC<{ config: ChartConfig; onConfigChange: (config: ChartConfig) => void }> = ({
  config,
  onConfigChange
}) => (
  <div className="theme-selector">
    <button
      className={`theme-btn ${config.theme === 'light' ? 'active' : ''}`}
      onClick={() => onConfigChange({ ...config, theme: 'light' })}
      title="Light theme"
    >
      <SunIcon />
    </button>
    <button
      className={`theme-btn ${config.theme === 'dark' ? 'active' : ''}`}
      onClick={() => onConfigChange({ ...config, theme: 'dark' })}
      title="Dark theme"
    >
      <MoonIcon />
    </button>
  </div>
);

export default Header;