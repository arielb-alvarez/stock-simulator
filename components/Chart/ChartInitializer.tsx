import React, { useCallback, useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { ChartConfig } from '../../types';

interface ChartInitializerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  config: ChartConfig;
  isMobile: boolean;
  onChartReady: (chart: IChartApi, series: ISeriesApi<'Candlestick'>) => void;
  onChartCleanup: () => void;
}

const ChartInitializer: React.FC<ChartInitializerProps> = ({
  containerRef,
  config,
  isMobile,
  onChartReady,
  onChartCleanup
}) => {
  const chartRef = useRef<IChartApi>();
  const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
  const isInitializedRef = useRef(false);

  const initializeChart = useCallback(() => {
    if (!containerRef.current || isInitializedRef.current) return;

    const container = containerRef.current;
    const chart = createChart(container, {
      layout: {
        backgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
        textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: { color: config.theme === 'dark' ? '#334158' : '#D6DCDE' },
        horzLines: { color: config.theme === 'dark' ? '#334158' : '#D6DCDE' },
      },
      width: container.clientWidth,
      height: container.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        barSpacing: isMobile ? 4 : 6,
        minBarSpacing: 1,
      },
      crosshair: { mode: 1 },
      handleScroll: { mouseWheel: !isMobile, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: !isMobile, pinch: true },
    } as any);

    const series = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    chartRef.current = chart;
    seriesRef.current = series;
    isInitializedRef.current = true;
    onChartReady(chart, series);
  }, [containerRef, config, isMobile, onChartReady]);

  useEffect(() => {
    initializeChart();
    
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
      }
      onChartCleanup();
      isInitializedRef.current = false;
    };
  }, [initializeChart, onChartCleanup]);

  return null;
};

export default ChartInitializer;