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
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="Real-time BTC/USDT trading chart with drawing tools" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header>
        <h1 style={{ 
          fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
          margin: '0 0 10px 0',
          textAlign: 'center' 
        }}>
          BTC/USDT Trading Chart
        </h1>
        <div className="connection-status">
          Status: {isConnected ? 'Connected' : 'Disconnected'}
          {timeframe && ` | TF: ${timeframe}`}
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

      <main className="chart-wrapper">
        <Chart 
          data={candleData} 
          config={config}
          drawings={drawings}
          onDrawingsUpdate={saveDrawings}
          timeframe={timeframe}
        />
      </main>
    </div>
  );
};

export default Home;