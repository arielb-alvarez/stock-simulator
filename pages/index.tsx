import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';
import useCryptoData from '../hooks/useCryptoData';
import useCookies from '../hooks/useCookies';
import { ChartConfig } from '../types';

// SVG Icon Components
const SunIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

const ClearIcon = ({ color = 'currentColor', size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    <line x1="10" y1="11" x2="10" y2="17"/>
    <line x1="14" y1="11" x2="14" y2="17"/>
  </svg>
);

const ConnectionDotIcon = ({ connected = true, size = 6 }) => (
  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <circle 
      cx={size/2} 
      cy={size/2} 
      r={size/2} 
      fill={connected ? '#10B981' : '#EF4444'}
    />
  </svg>
);

const Home: React.FC = () => {
  const [timeframe, setTimeframe] = useState('5m');
  const { candleData, isConnected, error, dataSource } = useCryptoData('btcusdt', timeframe);
  const { drawings, chartConfig, saveDrawings, saveChartConfig, clearDrawings } = useCookies();
  const [config, setConfig] = useState<ChartConfig>({
    ...chartConfig,
    type: 'candlestick'
  });

  useEffect(() => {
    if (candleData.length > 0) {
      saveChartConfig(config);
    }
  }, [config, candleData.length]);

  const updateConfig = (newConfig: ChartConfig) => {
    setConfig(newConfig);
    saveChartConfig(newConfig);
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const handleClearDrawings = () => {
    if (window.confirm('Are you sure you want to clear all drawings?')) {
      clearDrawings();
    }
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
    <div className={`container ${config.theme}`}>
      <Head>
        <title>BTC/USDT Trading Chart</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="BTC/USDT Trading Chart" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Compact Header */}
      <header className="main-header">
        <div className="header-left">
          <h1 className="chart-title">BTC/USDT</h1>
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <ConnectionDotIcon connected={isConnected} />
            {isConnected ? 'Live' : 'Offline'}
          </div>
        </div>

        <div className="header-center">
          <div className="timeframe-selector">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                className={`timeframe-btn ${timeframe === tf.value ? 'active' : ''}`}
                onClick={() => handleTimeframeChange(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="header-right">
          <button 
            className="clear-btn"
            onClick={handleClearDrawings}
            title="Clear Drawings"
          >
            <ClearIcon color="white" />
            <span>Clear</span>
          </button>
          
          <div className="theme-selector">
            <button
              className={`theme-btn ${config.theme === 'light' ? 'active' : ''}`}
              onClick={() => updateConfig({ ...config, theme: 'light' })}
              title="Light theme"
            >
              <SunIcon color={config.theme === 'light' ? '#2563EB' : (config.theme === 'dark' ? '#9CA3AF' : '#6B7280')} />
            </button>
            <button
              className={`theme-btn ${config.theme === 'dark' ? 'active' : ''}`}
              onClick={() => updateConfig({ ...config, theme: 'dark' })}
              title="Dark theme"
            >
              <MoonIcon color={config.theme === 'dark' ? '#2563EB' : '#6B7280'} />
            </button>
          </div>
        </div>
      </header>

      {/* Chart Area - Takes remaining space */}
      <main className="chart-main">
        <Chart 
          key={`${config.theme}-${timeframe}`}
          data={candleData} 
          config={config}
          drawings={drawings}
          onDrawingsUpdate={saveDrawings}
          timeframe={timeframe}
        />
      </main>

      <style jsx>{`
        .container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          padding: 8px;
        }

        .container.dark {
          background-color: #131722;
          color: #D9D9D9;
        }

        .container.light {
          background-color: #FFFFFF;
          color: #191919;
        }

        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          margin-bottom: 8px;
          border-bottom: 1px solid ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
          flex-shrink: 0;
          min-height: 40px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .header-center {
          display: flex;
          justify-content: center;
          flex: 2;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex: 1;
          justify-content: flex-end;
        }

        .chart-title {
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
          white-space: nowrap;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          padding: 2px 6px;
          border-radius: 3px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          white-space: nowrap;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .connection-status.connected .status-dot {
          background-color: #10B981;
        }

        .connection-status.disconnected .status-dot {
          background-color: #EF4444;
        }

        .timeframe-selector {
          display: flex;
          gap: 1px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          padding: 2px;
          border-radius: 4px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .timeframe-btn {
          padding: 3px 6px;
          border: none;
          background: transparent;
          border-radius: 2px;
          font-size: 0.7rem;
          font-weight: 500;
          cursor: pointer;
          color: ${config.theme === 'dark' ? '#9CA3AF' : '#6B7280'};
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .timeframe-btn:hover {
          background: ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
          color: ${config.theme === 'dark' ? '#FFFFFF' : '#374151'};
        }

        .timeframe-btn.active {
          background: ${config.theme === 'dark' ? '#3B82F6' : '#2563EB'};
          color: white;
        }

        .clear-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 3px 8px;
          border: none;
          background: ${config.theme === 'dark' ? '#EF4444' : '#DC2626'};
          color: white;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease;
          white-space: nowrap;
        }

        .clear-btn:hover {
          opacity: 0.9;
        }

        .theme-selector {
          display: flex;
          gap: 1px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
          padding: 2px;
          border-radius: 4px;
        }

        .theme-btn {
          padding: 3px 6px;
          border: none;
          background: transparent;
          border-radius: 2px;
          cursor: pointer;
          font-size: 0.7rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-btn:hover {
          background: ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
        }

        .theme-btn.active {
          background: ${config.theme === 'dark' ? '#334158' : '#D1D5DB'};
        }

        .chart-main {
          flex: 1;
          display: flex;
          min-height: 0; /* Important for flex children */
          position: relative;
        }

        /* Mobile Styles */
        @media (max-width: 768px) {
          .container {
            padding: 6px;
          }

          .main-header {
            flex-direction: column;
            gap: 6px;
            padding: 4px 0;
            margin-bottom: 6px;
            min-height: auto;
          }

          .header-left,
          .header-center,
          .header-right {
            width: 100%;
            justify-content: center;
          }

          .header-left {
            order: 1;
          }

          .header-center {
            order: 3;
          }

          .header-right {
            order: 2;
            gap: 8px;
          }

          .chart-title {
            font-size: 0.9rem;
          }

          .timeframe-selector {
            max-width: 100%;
            overflow-x: auto;
          }

          .timeframe-btn {
            padding: 4px 8px;
            font-size: 0.65rem;
          }

          .clear-btn span {
            display: none;
          }

          .clear-btn {
            padding: 4px;
          }
        }

        /* Very small screens */
        @media (max-width: 480px) {
          .container {
            padding: 4px;
          }

          .main-header {
            gap: 4px;
          }

          .header-right {
            flex-wrap: wrap;
            justify-content: center;
          }

          .theme-selector {
            order: -1;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;