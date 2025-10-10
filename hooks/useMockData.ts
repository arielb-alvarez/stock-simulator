import { useEffect, useState, useRef } from 'react';
import { CandleStickData } from '../types';

const useMockData = (symbol: string, timeframe: string) => {
  const [candleData, setCandleData] = useState<CandleStickData[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate realistic mock candlestick data
  const generateMockHistoricalData = () => {
    const mockData: CandleStickData[] = [];
    const now = Date.now();
    let intervalMs = 60000; // 1 minute in milliseconds
    let dataPoints = 500;
    
    // Set interval and data points based on timeframe
    switch(timeframe) {
      case '1m': 
        intervalMs = 60000;
        dataPoints = 500;
        break;
      case '5m': 
        intervalMs = 300000;
        dataPoints = 400;
        break;
      case '15m': 
        intervalMs = 900000;
        dataPoints = 400;
        break;
      case '1h': 
        intervalMs = 3600000;
        dataPoints = 300;
        break;
      case '4h': 
        intervalMs = 14400000;
        dataPoints = 200;
        break;
      case '1d': 
        intervalMs = 86400000;
        dataPoints = 100;
        break;
      default: 
        intervalMs = 60000;
        dataPoints = 500;
    }
    
    // Start with a realistic price
    let currentPrice = 30000 + (Math.random() * 5000);
    
    // Create mock data
    for (let i = dataPoints; i > 0; i--) {
      const time = now - (i * intervalMs);
      
      // Create more realistic price movements
      const volatility = 0.005; // 0.5% volatility
      const changePercent = (Math.random() - 0.5) * volatility;
      const open = currentPrice;
      const close = open * (1 + changePercent);
      const high = Math.max(open, close) * (1 + Math.random() * volatility/2);
      const low = Math.min(open, close) * (1 - Math.random() * volatility/2);
      const volume = 100 + Math.random() * 1000;
      
      mockData.push({ time, open, high, low, close, volume });
      
      // Set next open to this close
      currentPrice = close;
    }
    
    setCandleData(mockData);
    setError(null);
  };

  // Simulate real-time updates
  const startRealTimeUpdates = () => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }
    
    let intervalMs = 1000; // Update every second for all timeframes
    
    updateInterval.current = setInterval(() => {
      setCandleData(prevData => {
        if (prevData.length === 0) return prevData;
        
        const lastCandle = {...prevData[prevData.length - 1]};
        const now = Date.now();
        
        // Only create new candle if the timeframe has elapsed
        let shouldCreateNewCandle = false;
        let timeframeMs = 60000;
        
        switch(timeframe) {
          case '1m': timeframeMs = 60000; break;
          case '5m': timeframeMs = 300000; break;
          case '15m': timeframeMs = 900000; break;
          case '1h': timeframeMs = 3600000; break;
          case '4h': timeframeMs = 14400000; break;
          case '1d': timeframeMs = 86400000; break;
        }
        
        if (now - lastCandle.time >= timeframeMs) {
          shouldCreateNewCandle = true;
        }
        
        if (shouldCreateNewCandle) {
          // Create new candle
          const volatility = 0.002; // 0.2% volatility for new candles
          const changePercent = (Math.random() - 0.5) * volatility;
          const open = lastCandle.close;
          const close = open * (1 + changePercent);
          const high = Math.max(open, close) * (1 + Math.random() * volatility/2);
          const low = Math.min(open, close) * (1 - Math.random() * volatility/2);
          const volume = 100 + Math.random() * 1000;
          
          const newCandle = { time: now, open, high, low, close, volume };
          return [...prevData.slice(1), newCandle]; // Remove oldest, add newest
        } else {
          // Update current candle - safely access volume with fallback
          const volatility = 0.001; // 0.1% volatility for updates
          const changePercent = (Math.random() - 0.5) * volatility;
          const close = lastCandle.close * (1 + changePercent);
          const high = Math.max(lastCandle.high, close);
          const low = Math.min(lastCandle.low, close);
          const currentVolume = lastCandle.volume ?? 100; // Fallback to 100 if undefined
          
          const updatedCandle = { 
            ...lastCandle, 
            high, 
            low, 
            close,
            volume: currentVolume + Math.random() * 10
          };
          
          return [...prevData.slice(0, -1), updatedCandle];
        }
      });
    }, intervalMs);
  };

  useEffect(() => {
    generateMockHistoricalData();
    startRealTimeUpdates();
    
    return () => {
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [timeframe]);

  return { candleData, isConnected, error };
};

export default useMockData;