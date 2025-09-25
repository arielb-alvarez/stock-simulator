import React from 'react';
import { ChartConfig } from '../types';

interface ToolbarProps {
  config: ChartConfig;
  onConfigChange: (config: ChartConfig) => void;
  onTimeframeChange: (timeframe: string) => void;
  timeframe: string;
  onClearDrawings?: () => void; // Add this prop
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

  return (
    <div className="toolbar">
      <div className="toolbar-section">
        <label>Timeframe:</label>
        <select 
          value={timeframe} 
          onChange={(e) => onTimeframeChange(e.target.value)}
        >
          <option value="1m">1 Minute</option>
          <option value="5m">5 Minutes</option>
          <option value="15m">15 Minutes</option>
          <option value="1h">1 Hour</option>
          <option value="4h">4 Hours</option>
          <option value="1d">1 Day</option>
        </select>
      </div>

      <button 
        onClick={onClearDrawings}
        style={{ 
          padding: '5px 10px',
          border: '1px solid #ccc',
          background: '#ff4444',
          color: 'white',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Clear Drawings
      </button>

      <div className="toolbar-section">
        <label>Theme:</label>
        <select 
          value={config.theme} 
          onChange={(e) => updateConfig({ theme: e.target.value as any })}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>

      <style jsx>{`
        .toolbar {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-bottom: 20px;
          padding: 10px;
          border-radius: 4px;
          background-color: ${config.theme === 'dark' ? '#1E222D' : '#F8F8F8'};
        }
        
        .toolbar-section {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        label {
          font-weight: bold;
        }
        
        select {
          padding: 5px;
          border-radius: 4px;
          border: 1px solid ${config.theme === 'dark' ? '#334158' : '#D6DCDE'};
          background-color: ${config.theme === 'dark' ? '#131722' : '#FFFFFF'};
          color: ${config.theme === 'dark' ? '#D9D9D9' : '#191919'};
        }
      `}</style>
    </div>
  );
};

export default Toolbar;