import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Chart from '../components/Chart/Chart';
import Header from '../components/UI/Header';
import useCryptoData from '../hooks/useCryptoData';
import useCookies from '../hooks/useCookies';
import { ChartConfig } from '../types';

const Home: React.FC = () => {
  const [timeframe, setTimeframe] = useState('5m');
  const { candleData, isConnected } = useCryptoData('btcusdt', timeframe);
  const { drawings, chartConfig, saveDrawings, saveChartConfig, clearDrawings } = useCookies();
  const [config, setConfig] = useState<ChartConfig>({
    ...chartConfig,
    type: 'candlestick'
  });

  useEffect(() => {
    if (candleData.length > 0) {
      saveChartConfig(config);
    }
  }, [config, candleData.length, saveChartConfig]);

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
        <title>BTC/USDT Trading Chart</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="BTC/USDT Trading Chart" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        config={config}
        onConfigChange={updateConfig}
        isConnected={isConnected}
        onClearDrawings={handleClearDrawings}
      />

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

        .chart-main {
          flex: 1;
          display: flex;
          min-height: 0;
          position: relative;
        }

        @media (max-width: 768px) {
          .container {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;