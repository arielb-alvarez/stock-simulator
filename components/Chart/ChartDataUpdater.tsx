import React, { useEffect } from 'react';
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { CandleStickData } from '../../types';

interface ChartDataUpdaterProps {
  chart: IChartApi;
  series: ISeriesApi<'Candlestick'>;
  data: CandleStickData[];
  timeframe: string;
}

const ChartDataUpdater: React.FC<ChartDataUpdaterProps> = ({
  chart,
  series,
  data,
  timeframe
}) => {
  useEffect(() => {
    if (!series || !data.length) return;

    const formattedData = data.map(item => ({
      time: (item.time / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    series.setData(formattedData);
    
    if (formattedData.length > 0) {
      const timeScale = chart.timeScale();
      timeScale.fitContent();
    }
  }, [chart, series, data, timeframe]);

  return null;
};

export default ChartDataUpdater;