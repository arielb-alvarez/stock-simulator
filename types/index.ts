import { UTCTimestamp } from "lightweight-charts";

export interface TradeData {
  e: string;     // Event type
  E: number;     // Event time
  s: string;     // Symbol
  t: number;     // Trade ID
  p: string;     // Price
  q: string;     // Quantity
  b: number;     // Buyer order ID
  a: number;     // Seller order ID
  T: number;     // Trade time
  m: boolean;    // Is the buyer the market maker?
  M: boolean;    // Ignore
}

export interface ChartDataPoint {
  time: number;
  value: number;
}

export interface CandleStickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface Drawing {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'freehand';
  points: Point[];
  color: string;
  width: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ChartConfig {
  theme: 'light' | 'dark';
  type: 'candlestick' | 'line' | 'bar';
}

export interface Point {
  time: number;
  price: number;
}

export interface MovingAverageConfig {
  period: number;
  color: string;
  lineWidth: 1 | 2 | 3 | 4;
  type: 'sma' | 'ema' | 'wma' | 'vwma';
  priceSource: 'close' | 'open' | 'high' | 'low' | 'hl2' | 'hlc3' | 'ohlc4';
  visible?: boolean;
}

export interface MovingAverageSeries {
  id: string;
  config: MovingAverageConfig;
  data: { time: UTCTimestamp; value: number }[];
}