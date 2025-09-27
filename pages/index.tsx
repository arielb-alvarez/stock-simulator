import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';
import useCryptoData from '../hooks/useCryptoData';
import useCookies from '../hooks/useCookies';
import { ChartConfig } from '../types';

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
            <span className="status-dot"></span>
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
            Clear
          </button>
          
          <div className="theme-selector">
            <button
              className={`theme-btn ${config.theme === 'light' ? 'active' : ''}`}
              onClick={() => updateConfig({ ...config, theme: 'light' })}
              title="Light theme"
            >
              ☀️
            </button>
            <button
              className={`theme-btn ${config.theme === 'dark' ? 'active' : ''}`}
              onClick={() => updateConfig({ ...config, theme: 'dark' })}
              title="Dark theme"
            >
              🌙
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