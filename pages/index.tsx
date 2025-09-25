import React, { useState } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart';
import Toolbar from '../components/Toolbar';
// import useMockData from '../hooks/useMockData';
import useCryptoData from '../hooks/useCryptoData';
import useCookies from '../hooks/useCookies';
import { ChartConfig } from '../types';

const Home: React.FC = () => {
  const [timeframe, setTimeframe] = useState('5m');
  // const { candleData, isConnected, error } = useMockData('btcusdt', timeframe);
  const { candleData, isConnected, error, dataSource } = useCryptoData('btcusdt', timeframe);
  const { drawings, chartConfig, saveDrawings, saveChartConfig, clearDrawings  } = useCookies();
  const [config, setConfig] = useState<ChartConfig>({
    ...chartConfig,
    type: 'candlestick'
  });

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

  return (
    <div className={`container ${config.theme}`}>
      <Head>
        <title>BTC/USDT TradingView-like App</title>
        <meta name="description" content="Real-time BTC/USDT trading chart with drawing tools" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <h1>BTC/USDT Trading Chart</h1>
        <div className="connection-status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
          {timeframe && ` | Timeframe: ${timeframe}`}
          {dataSource && ` | Source: ${dataSource}`}
          {error && ` | Error: ${error}`}
        </div>
      </header>

      <Toolbar 
        config={config} 
        onConfigChange={updateConfig} 
        onTimeframeChange={handleTimeframeChange}
        timeframe={timeframe}
        onClearDrawings={handleClearDrawings}
      />

      <main>
        <Chart 
          data={candleData} 
          config={config}
          drawings={drawings}
          onDrawingsUpdate={saveDrawings}
          timeframe={timeframe}
        />
      </main>

      <style jsx>{`
        .container {
          padding: 20px;
          min-height: 100vh;
        }
        
        .container.dark {
          background-color: #131722;
          color: #D9D9D9;
        }
        
        .container.light {
          background-color: #FFFFFF;
          color: #191919;
        }
        
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        
        .connection-status {
          padding: 5px 10px;
          border-radius: 4px;
          font-weight: bold;
          background-color: ${isConnected ? '#4CAF50' : '#F44336'};
          color: white;
        }
        
        .error-message {
          padding: 20px;
          background-color: ${config.theme === 'dark' ? '#2a2d3e' : '#f8f8f8'};
          border-radius: 4px;
          text-align: center;
          margin: 20px 0;
        }
        
        .error-message p {
          margin: 10px 0;
        }
      `}</style>
    </div>
  );
};

export default Home;