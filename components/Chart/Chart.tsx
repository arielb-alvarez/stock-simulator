import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createChart, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { CandleStickData, ChartConfig, Drawing } from '../../types';
import ChartContainer from './ChartContainer';
import DrawingLayer from './DrawingLayer';

interface ChartProps {
    data: CandleStickData[];
    config: ChartConfig;
    drawings: Drawing[];
    onDrawingsUpdate: (drawings: Drawing[]) => void;
    timeframe: string;
}

const Chart: React.FC<ChartProps> = ({ data, config, drawings, onDrawingsUpdate, timeframe }) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
    const [isChartReady, setIsChartReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
    const [viewportVersion, setViewportVersion] = useState(0);
    const lastViewportState = useRef<string>('');

    // Function to get current viewport state as a string for comparison
    const getViewportState = useCallback(() => {
        if (!chartRef.current) return '';
        
        const timeScale = chartRef.current.timeScale();
        const visibleRange = timeScale.getVisibleLogicalRange();
        const timeRange = timeScale.getVisibleRange(); // FIXED: getVisibleRange instead of getVisibleTimeRange
        
        return JSON.stringify({
            from: visibleRange?.from,
            to: visibleRange?.to,
            timeFrom: timeRange?.from,
            timeTo: timeRange?.to,
            width: chartDimensions.width,
            height: chartDimensions.height
        });
    }, [chartDimensions]);

    // Initialize chart and track dimensions
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const updateDimensions = () => {
            if (chartContainerRef.current) {
                const width = chartContainerRef.current.clientWidth;
                const height = chartContainerRef.current.clientHeight;
                setChartDimensions({ width, height });
                
                if (chartRef.current) {
                    chartRef.current.applyOptions({ width, height });
                }
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                backgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
                textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            crosshair: {
                mode: 1, // Enable crosshair
            },
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
        setIsChartReady(true);
        updateDimensions();

        // Set up resize observer
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (chartContainerRef.current) {
            resizeObserver.observe(chartContainerRef.current);
        }

        // Enhanced viewport change detection
        const handleViewportChange = () => {
            setViewportVersion(prev => prev + 1);
        };

        // Subscribe to chart events
        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
        chart.subscribeCrosshairMove(handleViewportChange);
        chart.subscribeClick(handleViewportChange);

        // Add wheel event for zooming
        const handleWheel = () => {
            setTimeout(handleViewportChange, 100); // Delay to allow chart to update
        };
        
        if (chartContainerRef.current) {
            chartContainerRef.current.addEventListener('wheel', handleWheel, { passive: true });
        }

        return () => {
            resizeObserver.disconnect();
            timeScale.unsubscribeVisibleTimeRangeChange(handleViewportChange);
            timeScale.unsubscribeVisibleLogicalRangeChange(handleViewportChange);
            chart.unsubscribeCrosshairMove(handleViewportChange);
            chart.unsubscribeClick(handleViewportChange);
            
            if (chartContainerRef.current) {
                chartContainerRef.current.removeEventListener('wheel', handleWheel);
            }
            
            if (chart) {
                chart.remove();
            }
            setIsChartReady(false);
        };
    }, [config.theme]);

    // Update chart data
    useEffect(() => {
        if (!seriesRef.current || !data.length) return;

        const formattedData = data.map(item => ({
            time: (item.time / 1000) as UTCTimestamp,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        seriesRef.current.setData(formattedData);
        
        if (chartRef.current && formattedData.length > 0) {
            chartRef.current.timeScale().fitContent();
        }
        
        // Force viewport update after data change
        setViewportVersion(prev => prev + 1);
    }, [data, timeframe]);

    // Check for mobile view
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <ChartContainer>
            <div 
                ref={chartContainerRef} 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    position: 'relative',
                    minHeight: '400px'
                }} 
            />
            
            {isChartReady && chartRef.current && seriesRef.current && (
                <DrawingLayer
                    chart={chartRef.current}
                    series={seriesRef.current}
                    drawings={drawings}
                    onDrawingsUpdate={onDrawingsUpdate}
                    config={config}
                    timeframe={timeframe}
                    isMobile={isMobile}
                    chartDimensions={chartDimensions}
                    chartContainerRef={chartContainerRef}
                />
            )}
        </ChartContainer>
    );
};

export default Chart;