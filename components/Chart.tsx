// Chart.tsx - Fixed version with proper cleanup
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { CandleStickData, Drawing, ChartConfig } from '../types';
import DrawingTools from './DrawingTools';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('DrawingTools error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong with the drawing tools.</div>;
    }

    return this.props.children;
  }
}

interface ChartProps {
  data: CandleStickData[];
  config: ChartConfig;
  drawings: Drawing[];
  onDrawingsUpdate: (drawings: Drawing[]) => void;
  timeframe: string;
}

const Chart: React.FC<ChartProps> = ({ data, config, drawings, onDrawingsUpdate, timeframe }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi>();
  const series = useRef<ISeriesApi<'Candlestick'>>();
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const [visibleRange, setVisibleRange] = useState<{ from: number; to: number } | null>(null);

  // Track if chart is disposed using a ref
  const isChartDisposed = useRef(false);

  // Use refs for event handlers to avoid stale closures
  const handlersRef = useRef<{
    handleVisibleRangeChange: (() => void) | null;
    handleResize: (() => void) | null;
  }>({ handleVisibleRangeChange: null, handleResize: null });

  // Function to check if chart is still valid
  const isChartValid = useCallback(() => {
    return chart.current && !isChartDisposed.current && chartContainerRef.current;
  }, []);

  // Function to get current visible time range
  const updateVisibleRange = useCallback(() => {
    if (!isChartValid()) return;
    
    try {
      const timeScale = chart.current!.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      if (visibleRange) {
        setVisibleRange({
          from: (visibleRange.from as number) * 1000,
          to: (visibleRange.to as number) * 1000
        });
      }
    } catch (error) {
      // If we get an error, the chart might be disposed
      if (!isChartValid()) {
        console.error('Error getting visible range:', error);
      }
    }
  }, [isChartValid]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Reset disposal flag
    isChartDisposed.current = false;

    // Initialize chart with proper interactivity options
    chart.current = createChart(chartContainerRef.current, {
      layout: {
        backgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
        textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
      },
      grid: {
        vertLines: {
          color: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        },
        horzLines: {
          color: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        rightOffset: 0,
        barSpacing: 6,
        minBarSpacing: 1,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
        axisDoubleClickReset: true,
        doubleClick: true,
      },
      kineticScroll: {
        mouse: true,
        touch: true,
      },
    } as any);

    // Create candlestick series
    series.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create stable event handlers
    const handleVisibleRangeChange = () => {
      updateVisibleRange();
    };

    const handleResize = () => {
      if (isChartValid()) {
        chart.current!.applyOptions({
          width: chartContainerRef.current!.clientWidth,
        });
        
        const chartElement = chart.current!.chartElement();
        setChartDimensions({
          width: chartElement.clientWidth,
          height: chartElement.clientHeight
        });
      }
      updateVisibleRange();
    };

    // Store handlers in ref for cleanup
    handlersRef.current = { handleVisibleRangeChange, handleResize };

    // Subscribe to time scale events
    const timeScale = chart.current.timeScale();
    timeScale.subscribeVisibleTimeRangeChange(handleVisibleRangeChange);
    timeScale.subscribeVisibleLogicalRangeChange(handleVisibleRangeChange);

    // Subscribe to crosshair movement for updates
    chart.current.subscribeCrosshairMove(handleVisibleRangeChange);

    const timer = setTimeout(() => {
      if (isChartValid()) {
        setIsChartReady(true);
        updateVisibleRange();
        
        const chartElement = chart.current!.chartElement();
        setChartDimensions({
          width: chartElement.clientWidth,
          height: chartElement.clientHeight
        });
      }
    }, 300);

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      
      // Mark chart as disposed
      isChartDisposed.current = true;
      
      // Remove event listeners first
      window.removeEventListener('resize', handleResize);
      
      // Clean up chart subscriptions and remove chart
      if (chart.current) {
        try {
          const timeScale = chart.current.timeScale();
          const { handleVisibleRangeChange } = handlersRef.current;
          
          if (handleVisibleRangeChange) {
            timeScale.unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
            timeScale.unsubscribeVisibleLogicalRangeChange(handleVisibleRangeChange);
            chart.current.unsubscribeCrosshairMove(handleVisibleRangeChange);
          }
          
          chart.current.remove();
        } catch (error) {
          // Ignore disposal errors
          console.warn('Error during chart cleanup:', error);
        }
      }
      
      setIsChartReady(false);
      handlersRef.current = { handleVisibleRangeChange: null, handleResize: null };
    };
  }, [config, updateVisibleRange, isChartValid]);

  useEffect(() => {
    if (!series.current || !data.length) return;

    const formattedData = data.map(item => ({
      time: (item.time / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));

    series.current.setData(formattedData);
    
    // Auto-scale to fit data but preserve visible range when possible
    if (isChartValid() && formattedData.length > 0) {
      const timeScale = chart.current!.timeScale();
      
      // Only fit content if we have new data or timeframe changed significantly
      timeScale.fitContent();
      
      // Force update of visible range after data change
      setTimeout(() => {
        updateVisibleRange();
        // Force re-render of drawing tools by updating chart dimensions
        const chartElement = chart.current!.chartElement();
        setChartDimensions({
          width: chartElement.clientWidth,
          height: chartElement.clientHeight
        });
      }, 100);
    }
  }, [data, timeframe, updateVisibleRange, isChartValid]);

  useEffect(() => {
  if (!isChartValid() || !data.length) return;
  
  // When timeframe changes, ensure drawings are re-rendered
  const timer = setTimeout(() => {
      updateVisibleRange();
      const chartElement = chart.current!.chartElement();
      setChartDimensions({
        width: chartElement.clientWidth,
        height: chartElement.clientHeight
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [timeframe, updateVisibleRange, isChartValid, data.length]);

  // Reset active tool when clicking outside drawing tools
  const handleChartClick = (e: React.MouseEvent) => {
    if (activeTool && e.target === chartContainerRef.current) {
      setActiveTool(null);
    }
  };

  return (
    <div className="chart-container" style={{ position: 'relative', width: '100%', height: '500px' }}>
      <ErrorBoundary>
        <div 
          ref={chartContainerRef} 
          style={{ width: '100%', height: '100%', position: 'relative' }} 
          onClick={handleChartClick}
        />
        {isChartReady && isChartValid() && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 10
          }}>
            <DrawingTools 
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              chart={chart.current!}
              series={series.current!}
              drawings={drawings}
              onDrawingsUpdate={onDrawingsUpdate}
              theme={config.theme}
              isChartReady={isChartReady}
              chartDimensions={chartDimensions}
              visibleRange={visibleRange}
            />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Chart;