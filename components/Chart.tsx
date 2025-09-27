// Chart.tsx - Responsive version
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
  const [isMobile, setIsMobile] = useState(false);

  // Track if chart is disposed using a ref
  const isChartDisposed = useRef(false);

  // Use refs for event handlers to avoid stale closures
  const handlersRef = useRef<{
    handleVisibleRangeChange: (() => void) | null;
    handleResize: (() => void) | null;
  }>({ handleVisibleRangeChange: null, handleResize: null });

  // Check for mobile view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      if (!isChartValid()) {
        console.error('Error getting visible range:', error);
      }
    }
  }, [isChartValid]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Reset disposal flag
    isChartDisposed.current = false;

    // Get container dimensions
    const containerWidth = chartContainerRef.current.clientWidth;
    const containerHeight = chartContainerRef.current.clientHeight;

    // Initialize chart with responsive options
    chart.current = createChart(chartContainerRef.current, {
      layout: {
        backgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
        textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      },
      grid: {
        vertLines: {
          color: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        },
        horzLines: {
          color: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        },
      },
      width: containerWidth,
      height: containerHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: config.theme === 'dark' ? '#334158' : '#D6DCDE',
        rightOffset: 0,
        barSpacing: isMobile ? 4 : 6,
        minBarSpacing: 1,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: true,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: {
        mouseWheel: !isMobile,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: !isMobile,
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
      if (isChartValid() && chartContainerRef.current) {
        const newWidth = chartContainerRef.current.clientWidth;
        const newHeight = chartContainerRef.current.clientHeight;
        
        chart.current!.applyOptions({
          width: newWidth,
          height: newHeight,
        });
        
        setChartDimensions({
          width: newWidth,
          height: newHeight
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
        
        setChartDimensions({
          width: containerWidth,
          height: containerHeight
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
          console.warn('Error during chart cleanup:', error);
        }
      }
      
      setIsChartReady(false);
      handlersRef.current = { handleVisibleRangeChange: null, handleResize: null };
    };
  }, [config, updateVisibleRange, isChartValid, isMobile]);

  // Update chart data
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
    
    if (isChartValid() && formattedData.length > 0) {
      const timeScale = chart.current!.timeScale();
      timeScale.fitContent();
      
      setTimeout(() => {
        updateVisibleRange();
        if (chartContainerRef.current) {
          setChartDimensions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight
          });
        }
      }, 100);
    }
  }, [data, timeframe, updateVisibleRange, isChartValid]);

  // Handle timeframe changes
  useEffect(() => {
    if (!isChartValid() || !data.length) return;
    
    const timer = setTimeout(() => {
      updateVisibleRange();
      if (chartContainerRef.current) {
        setChartDimensions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
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
    <div className="chart-container" onClick={handleChartClick}>
      <ErrorBoundary>
        <div 
          ref={chartContainerRef} 
          style={{ 
            width: '100%', 
            height: '100%', 
            position: 'relative',
            minHeight: isMobile ? '300px' : '400px'
          }} 
        />
        {isChartReady && isChartValid() && (
          <div className={`drawing-layer ${activeTool ? 'interactive' : ''}`}>
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
              isMobile={isMobile}
            />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Chart;