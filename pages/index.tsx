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

      {/* Combined Header and Toolbar */}
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
          >
            Clear Drawings
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

      <main className="chart-wrapper">
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
        .main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding: 12px 0;
          border-bottom: 1px solid ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
          flex-wrap: wrap;
          gap: 15px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 15px;
          flex: 1;
          min-width: 200px;
        }

        .header-center {
          display: flex;
          justify-content: center;
          flex: 1;
          min-width: 300px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          justify-content: flex-end;
          min-width: 200px;
        }

        .chart-title {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: ${config.theme === 'dark' ? '#FFFFFF' : '#1F2937'};
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          padding: 4px 8px;
          border-radius: 4px;
          background: ${config.theme === 'dark' ? '#1E222D' : '#F3F4F6'};
        }

        .status-dot {
          width: 8px;
          height: 8px;
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
          font-size: 0.875rem;
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

        .clear-btn {
          padding: 6px 12px;
          border: none;
          background: ${config.theme === 'dark' ? '#EF4444' : '#DC2626'};
          color: white;
          border-radius: 4px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .clear-btn:hover {
          opacity: 0.9;
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
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .theme-btn:hover {
          background: ${config.theme === 'dark' ? '#334158' : '#E5E7EB'};
        }

        .theme-btn.active {
          background: ${config.theme === 'dark' ? '#334158' : '#D1D5DB'};
        }

        @media (max-width: 768px) {
          .main-header {
            flex-direction: column;
            gap: 10px;
          }

          .header-left,
          .header-center,
          .header-right {
            justify-content: center;
            min-width: auto;
            width: 100%;
          }

          .header-left {
            order: 1;
          }

          .header-center {
            order: 3;
          }

          .header-right {
            order: 2;
          }

          .chart-title {
            font-size: 1.25rem;
          }

          .timeframe-selector {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;