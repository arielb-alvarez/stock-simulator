import { useEffect, useState } from 'react';
import { CandleStickData } from '../types';

const useCryptoData = (symbol: string, timeframe: string) => {
  const [candleData, setCandleData] = useState<CandleStickData[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Try CryptoCompare first (usually most accessible)
        const cryptoCompareUrl = `https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USDT&limit=2000&aggregate=${getCryptoCompareAggregate(timeframe)}`;
        
        const response = await fetch(cryptoCompareUrl);
        if (response.ok) {
          const result = await response.json();
          const parsedData = parseCryptoCompareData(result);
          setCandleData(parsedData);
          setDataSource('CryptoCompare');
          setError(null);
          setIsConnected(true);
          return;
        }
        
        // If CryptoCompare fails, try Gemini
        const geminiUrl = `https://api.gemini.com/v2/candles/btcusd/${getGeminiTimeframe(timeframe)}`;
        const geminiResponse = await fetch(geminiUrl);
        if (geminiResponse.ok) {
          const result = await geminiResponse.json();
          const parsedData = parseGeminiData(result);
          setCandleData(parsedData);
          setDataSource('Gemini');
          setError(null);
          setIsConnected(true);
          return;
        }
        
        // If both fail, use mock data
        throw new Error('Both APIs failed');
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Using mock data (APIs unavailable)');
        setDataSource('Mock Data');
        generateMockData(timeframe, setCandleData);
        setIsConnected(false);
      }
    };

    fetchData();
    
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  return { candleData, isConnected, error, dataSource };
};

// Helper functions for different exchanges
const getCryptoCompareAggregate = (timeframe: string): number => {
  const mapping: {[key: string]: number} = {
    '1m': 1, '5m': 5, '15m': 15, 
    '1h': 60, '4h': 240, '1d': 1440
  };
  return mapping[timeframe] || 1;
};

const parseCryptoCompareData = (data: any): CandleStickData[] => {
  if (!data.Data || !data.Data.Data) return [];
  return data.Data.Data.map((candle: any) => ({
    time: candle.time * 1000, // Convert to milliseconds
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volumeto
  }));
};

// Helper functions for Gemini API
const getGeminiTimeframe = (timeframe: string): string => {
  const mapping: {[key: string]: string} = {
    '1m': '1m', '5m': '5m', '15m': '15m', 
    '1h': '1hr', '4h': '4hr', '1d': '1day'
  };
  return mapping[timeframe] || '5m';
};

const parseGeminiData = (data: any[]): CandleStickData[] => {
  return data.map((candle: any[]) => ({
    time: candle[0],
    open: parseFloat(candle[1]),
    high: parseFloat(candle[2]),
    low: parseFloat(candle[3]),
    close: parseFloat(candle[4]),
    volume: parseFloat(candle[5])
  }));
};

const generateMockData = (timeframe: string, setCandleData: (data: CandleStickData[]) => void) => {
  const mockData: CandleStickData[] = [];
  const now = Date.now();
  const basePrice = 30000 + Math.random() * 5000;
  let intervalMs = 3600000; // 1 hour in milliseconds
  
  switch(timeframe) {
    case '1m': intervalMs = 60000; break;
    case '5m': intervalMs = 300000; break;
    case '15m': intervalMs = 900000; break;
    case '1h': intervalMs = 3600000; break;
    case '4h': intervalMs = 14400000; break;
    case '1d': intervalMs = 86400000; break;
  }
  
  for (let i = 100; i > 0; i--) {
    const time = now - (i * intervalMs);
    const open = basePrice + (Math.random() - 0.5) * 1000;
    const high = open + Math.random() * 200;
    const low = open - Math.random() * 200;
    const close = open + (Math.random() - 0.5) * 100;
    const volume = 100 + Math.random() * 1000;
    
    mockData.push({ time, open, high, low, close, volume });
  }
  
  setCandleData(mockData);
};

export default useCryptoData;