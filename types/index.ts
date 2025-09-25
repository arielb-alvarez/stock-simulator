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