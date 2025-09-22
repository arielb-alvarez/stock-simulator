import { useEffect, useRef, useState } from 'react';
import { TradeData, ChartDataPoint, CandleStickData } from '../types';

const useWebSocket = (symbol: string, timeframe: string) => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [candleData, setCandleData] = useState<CandleStickData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const restInterval = useRef<NodeJS.Timeout | null>(null);

  // Generate mock historical data when API fails
  const generateMockHistoricalData = () => {
    const mockData: CandleStickData[] = [];
    const now = Date.now();
    const basePrice = 30000 + Math.random() * 5000;
    let intervalMs = 60000; // 1 minute in milliseconds
    
    // Set interval based on timeframe
    switch(timeframe) {
      case '1m': intervalMs = 60000; break;
      case '5m': intervalMs = 300000; break;
      case '15m': intervalMs = 900000; break;
      case '1h': intervalMs = 3600000; break;
      case '4h': intervalMs = 14400000; break;
      case '1d': intervalMs = 86400000; break;
      default: intervalMs = 60000;
    }
    
    // Create mock data for the last 500 periods
    for (let i = 500; i > 0; i--) {
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

  // Try alternative APIs for historical data
  const tryAlternativeAPIs = async () => {
    try {
      // Try CoinGecko API as an alternative
      console.log('Trying CoinGecko API as fallback...');
      
      // Determine days parameter based on timeframe
      let days = '1';
      if (timeframe === '4h' || timeframe === '1d') days = '30';
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=${days}&interval=${
          timeframe === '1d' ? 'daily' : 'hourly'
        }`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert CoinGecko format to our CandleStickData format
      const historicalData: CandleStickData[] = data.prices.map((price: [number, number], index: number) => {
        const time = price[0];
        const open = price[1];
        // For simplicity, use the same value for open, high, low, close
        // In a real app, you'd want to get proper OHLC data
        return {
          time,
          open,
          high: open * (1 + Math.random() * 0.05),
          low: open * (1 - Math.random() * 0.05),
          close: open * (1 + (Math.random() - 0.5) * 0.02),
          volume: 100 + Math.random() * 1000
        };
      });
      
      setCandleData(historicalData);
      setError('Using CoinGecko data (Binance API unavailable)');
    } catch (geckoError) {
      console.error('CoinGecko API also failed:', geckoError);
      // If CoinGecko also fails, generate mock data
      generateMockHistoricalData();
      setError('All APIs failed, using simulated data');
    }
  };

  // Fetch historical candlestick data
  const fetchHistoricalData = async () => {
    try {
      // Determine the limit based on timeframe
      let limit = 500;
      let interval = '1m';
      
      switch(timeframe) {
        case '1m': limit = 500; interval = '1m'; break;
        case '5m': limit = 500; interval = '5m'; break;
        case '15m': limit = 500; interval = '15m'; break;
        case '1h': limit = 500; interval = '1h'; break;
        case '4h': limit = 250; interval = '4h'; break;
        case '1d': limit = 100; interval = '1d'; break;
        default: limit = 500; interval = '1m';
      }
      
      // Try Binance API first
      const response = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const klines = await response.json();
      
      // Convert Binance kline format to our CandleStickData format
      const historicalData: CandleStickData[] = klines.map((kline: any[]) => ({
        time: kline[0],
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
      
      setCandleData(historicalData);
    } catch (err) {
      console.error('Error fetching historical data from Binance:', err);
      // Try alternative APIs if Binance fails
      tryAlternativeAPIs();
    }
  };

  // Fetch recent trades from REST API
  const fetchRecentTrades = async () => {
    try {
      // Try Binance first
      const response = await fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol.toUpperCase()}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const trades = await response.json();
      
      trades.forEach((trade: any) => {
        const newDataPoint: ChartDataPoint = {
          time: trade.time,
          value: parseFloat(trade.price)
        };
        
        setData(prevData => {
          const newData = [...prevData, newDataPoint];
          return newData.slice(-10000);
        });
      });
    } catch (err) {
      console.error('Error fetching trades from REST API:', err);
      // If Binance fails, simulate some trades
      const newDataPoint: ChartDataPoint = {
        time: Date.now(),
        value: 30000 + Math.random() * 1000
      };
      
      setData(prevData => {
        const newData = [...prevData, newDataPoint];
        return newData.slice(-100);
      });
    }
  };

  useEffect(() => {
    // Fetch historical data when component mounts or timeframe changes
    fetchHistoricalData();
    
    const connectWebSocket = () => {
      try {
        // Try multiple WebSocket endpoints
        const endpoints = [
          `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`,
          `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@trade`,
          `wss://data-stream.binance.vision/ws/${symbol.toLowerCase()}@trade`
        ];
        
        // Try each endpoint until one works
        let currentEndpointIndex = 0;
        
        const tryNextEndpoint = () => {
          if (currentEndpointIndex >= endpoints.length) {
            // All endpoints failed, use REST API fallback
            setError('All WebSocket endpoints failed, using REST API fallback');
            
            // Start REST API polling
            if (!restInterval.current) {
              fetchRecentTrades();
              restInterval.current = setInterval(fetchRecentTrades, 5000);
            }
            return;
          }
          
          const endpoint = endpoints[currentEndpointIndex];
          console.log(`Trying WebSocket endpoint: ${endpoint}`);
          
          ws.current = new WebSocket(endpoint);
          
          ws.current.onopen = () => {
            setIsConnected(true);
            setError(null);
            console.log('WebSocket connected to:', endpoint);
            
            // Clear REST interval if it was running
            if (restInterval.current) {
              clearInterval(restInterval.current);
              restInterval.current = null;
            }
          };

          ws.current.onmessage = (event) => {
            try {
              const tradeData: TradeData = JSON.parse(event.data);
              const newDataPoint: ChartDataPoint = {
                time: tradeData.T,
                value: parseFloat(tradeData.p)
              };
              
              setData(prevData => {
                const newData = [...prevData, newDataPoint];
                return newData.slice(-10000);
              });
            } catch (parseError) {
              console.error('Error parsing WebSocket message:', parseError);
            }
          };

          ws.current.onclose = (event) => {
            setIsConnected(false);
            console.log('WebSocket disconnected from:', endpoint, event.code, event.reason);
            
            // Try the next endpoint
            currentEndpointIndex++;
            setTimeout(tryNextEndpoint, 1000);
          };

          ws.current.onerror = (error) => {
            console.error('WebSocket error for endpoint:', endpoint, error);
            // Close the connection to trigger onclose and try next endpoint
            if (ws.current) {
              ws.current.close();
            }
          };
        };
        
        tryNextEndpoint();
      } catch (err) {
        console.error('Error creating WebSocket:', err);
        setError('Failed to create WebSocket connection');
        
        // Fall back to REST API if WebSocket fails to create
        if (!restInterval.current) {
          restInterval.current = setInterval(fetchRecentTrades, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close(1000, 'Component unmounted');
      }
      if (restInterval.current) {
        clearInterval(restInterval.current);
      }
    };
  }, [symbol, timeframe]);

  return { data, candleData, isConnected, error };
};

export default useWebSocket;