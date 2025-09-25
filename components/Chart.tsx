// Chart.tsx
import React, { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!chartContainerRef.current) return;

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
        // Enable zoom and pan
        rightOffset: 0,
        barSpacing: 6,
        minBarSpacing: 1,
        fixLeftEdge: false,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      crosshair: {
        mode: 1, // Enable crosshair
      },
      // Enable all interaction modes
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false, // Disable vertical drag for time scale scrolling
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

    // Set chart as ready after initialization
    const timer = setTimeout(() => {
      setIsChartReady(true);
      
      if (chart.current) {
        const chartElement = chart.current.chartElement();
        setChartDimensions({
          width: chartElement.clientWidth,
          height: chartElement.clientHeight
        });
      }
    }, 300);

    // Handle window resize
    const handleResize = () => {
      if (chart.current && chartContainerRef.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
        
        if (chart.current) {
          const chartElement = chart.current.chartElement();
          setChartDimensions({
            width: chartElement.clientWidth,
            height: chartElement.clientHeight
          });
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
      }
      setIsChartReady(false);
    };
  }, [config]);

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
    
    // Auto-scale to fit data
    if (chart.current && formattedData.length > 0) {
      chart.current.timeScale().fitContent();
      
      setTimeout(() => {
        setIsChartReady(true);
      }, 200);
    }
  }, [data, timeframe]);

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
        {isChartReady && chart.current && series.current && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Critical: allow events to pass through
            zIndex: 10 // Lower than chart but above for drawing
          }}>
            <DrawingTools 
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              chart={chart.current}
              series={series.current}
              drawings={drawings}
              onDrawingsUpdate={onDrawingsUpdate}
              theme={config.theme}
              isChartReady={isChartReady}
              chartDimensions={chartDimensions}
            />
          </div>
        )}
      </ErrorBoundary>
    </div>
  );
};

export default Chart;