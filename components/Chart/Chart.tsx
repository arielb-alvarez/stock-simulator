import React, { useRef, useState, useCallback, useEffect } from 'react';
import { createChart, CrosshairMode, IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { CandleStickData, ChartConfig, Drawing } from '../../types';
import { MovingAverageConfig, MovingAverageService } from '../../services/MovingAverageService';
import ChartContainer from './ChartContainer';
import DrawingLayer from './DrawingLayer';
import MovingAverageControls from './MovingAverageControls';

interface ChartProps {
    data: CandleStickData[];
    config: ChartConfig;
    drawings: Drawing[];
    onDrawingsUpdate: (drawings: Drawing[]) => void;
    timeframe: string;
}

const Chart: React.FC<ChartProps> = ({ 
    data, 
    config, 
    drawings, 
    onDrawingsUpdate, 
    timeframe
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
    const movingAverageSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    
    const [isChartReady, setIsChartReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
    const [viewportVersion, setViewportVersion] = useState(0);
    
    // Use global moving average configurations
    const [movingAverageConfigs, setMovingAverageConfigs] = useState<MovingAverageConfig[]>(
        MovingAverageService.getConfigs()
    );

    const lastViewportState = useRef<string>('');

    // Subscribe to global configuration changes
    useEffect(() => {
        const unsubscribe = MovingAverageService.subscribeToConfigChanges((newConfigs) => {
            setMovingAverageConfigs(newConfigs);
        });
        
        return unsubscribe;
    }, []);

    // Generate MA ID function
    const generateMAId = useCallback((config: MovingAverageConfig): string => {
        return `${config.type}-${config.period}-${config.priceSource}`;
    }, []);

    // Initialize chart
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
                mode: CrosshairMode.Normal,
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

        const handleViewportChange = () => {
            setViewportVersion(prev => prev + 1);
        };

        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
        chart.subscribeCrosshairMove(handleViewportChange);
        chart.subscribeClick(handleViewportChange);

        const handleWheel = () => {
            setTimeout(handleViewportChange, 100);
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
            
            // Clean up moving average series
            movingAverageSeriesRef.current.forEach((series) => {
                chart.removeSeries(series);
            });
            movingAverageSeriesRef.current.clear();
            
            if (chart) {
                chart.remove();
            }
            setIsChartReady(false);
        };
    }, [config.theme]);

    // Update moving averages function
    const updateMovingAverages = useCallback(() => {
        if (!chartRef.current || !data.length) return;

        // Remove all existing moving average series
        movingAverageSeriesRef.current.forEach((series, id) => {
            chartRef.current?.removeSeries(series);
        });
        movingAverageSeriesRef.current.clear();

        // Calculate and add moving averages
        movingAverageConfigs.forEach(config => {
            if (!config.visible) return;

            const maResult = MovingAverageService.calculateMovingAverage(data, config);
            
            if (maResult.data.length > 0) {
                const maSeries = chartRef.current!.addLineSeries({
                    color: config.color,
                    lineWidth: config.lineWidth,
                    title: `${config.type.toUpperCase()}(${config.period})`,
                    priceScaleId: 'right',
                });

                maSeries.setData(maResult.data);
                movingAverageSeriesRef.current.set(generateMAId(config), maSeries);
            }
        });
    }, [data, movingAverageConfigs, generateMAId]);

    // Update chart data and moving averages
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
        
        // Update moving averages
        updateMovingAverages();
        
        if (chartRef.current && formattedData.length > 0) {
            chartRef.current.timeScale().fitContent();
        }
        
        setViewportVersion(prev => prev + 1);
    }, [data, timeframe, updateMovingAverages]);

    // Update moving averages when configs change
    useEffect(() => {
        if (isChartReady && data.length > 0) {
            updateMovingAverages();
        }
    }, [movingAverageConfigs, isChartReady, data.length, updateMovingAverages]);

    // Handle moving average configuration changes - now updates globally
    const handleMovingAveragesUpdate = useCallback((newConfigs: MovingAverageConfig[]) => {
        MovingAverageService.setConfigs(newConfigs);
        // No need to call setMovingAverageConfigs here because we're subscribed to changes
    }, []);

    // Toggle moving average visibility globally
    const toggleMovingAverageVisibility = useCallback((index: number) => {
        const newConfigs = [...movingAverageConfigs];
        newConfigs[index] = {
            ...newConfigs[index],
            visible: !newConfigs[index].visible
        };
        MovingAverageService.setConfigs(newConfigs);
    }, [movingAverageConfigs]);

    // Add new moving average globally
    const addMovingAverage = useCallback((config: MovingAverageConfig) => {
        MovingAverageService.addConfig({ ...config, visible: true });
    }, []);

    // Remove moving average globally
    const removeMovingAverage = useCallback((index: number) => {
        MovingAverageService.removeConfig(index);
    }, []);

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
            
            {/* Moving Average Controls */}
            <MovingAverageControls
                configs={movingAverageConfigs}
                onConfigsUpdate={handleMovingAveragesUpdate}
                onToggleVisibility={toggleMovingAverageVisibility}
                onAddMovingAverage={addMovingAverage}
                onRemoveMovingAverage={removeMovingAverage}
                theme={config.theme}
                isMobile={isMobile}
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