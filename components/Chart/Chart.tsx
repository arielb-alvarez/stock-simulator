import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  Time
} from 'lightweight-charts';
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
    realTimeData?: CandleStickData | null;
    isRealTime?: boolean;
}

const Chart: React.FC<ChartProps> = ({ 
    data, 
    config, 
    drawings, 
    onDrawingsUpdate, 
    timeframe,
    realTimeData = null,
    isRealTime = false
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi>();
    const seriesRef = useRef<ISeriesApi<'Candlestick'>>();
    const movingAverageSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    
    const [isChartReady, setIsChartReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
    const [viewportVersion, setViewportVersion] = useState(0);
    
    const lastProcessedTimeRef = useRef<number>(0);
    const currentDataRef = useRef<CandleStickData[]>([]);
    
    const [movingAverageConfigs, setMovingAverageConfigs] = useState<MovingAverageConfig[]>(
        MovingAverageService.getConfigs()
    );

    // Initialize currentDataRef when data prop changes
    useEffect(() => {
        currentDataRef.current = [...data];
        if (data.length > 0) {
            lastProcessedTimeRef.current = data[data.length - 1].time;
        }
    }, [data]);

    // Subscribe to global configuration changes
    useEffect(() => {
        const unsubscribe = MovingAverageService.subscribeToConfigChanges((newConfigs) => {
            console.log('Config changed, updating state:', newConfigs.length);
            setMovingAverageConfigs([...newConfigs]);
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
                    chartRef.current.applyOptions({ 
                        width, 
                        height,
                        autoSize: true 
                    });
                }
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: config.theme === 'dark' ? '#131722' : '#FFFFFF' },
                textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
                fontSize: isMobile ? 12 : 14,
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
                autoScale: true,
            },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false },
            },
            crosshair: {
                mode: 1, // Normal mode
                vertLine: {
                    width: 1,
                    color: config.theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    style: 2, // Dotted
                    labelBackgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
                },
                horzLine: {
                    width: 1,
                    color: config.theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    style: 2, // Dotted
                    labelBackgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
                },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
            kineticScroll: {
                mouse: false,
                touch: true,
            },
        });

        const series = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceScaleId: 'right',
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
            
            movingAverageSeriesRef.current.forEach((series) => {
                chart.removeSeries(series);
            });
            movingAverageSeriesRef.current.clear();
            
            chart.remove();
            setIsChartReady(false);
        };
    }, [config.theme, isMobile]);

    // Enhanced moving average calculation that works with current dataset
    const calculateMovingAverages = useCallback((dataForCalculation: CandleStickData[]) => {
        if (!chartRef.current || !dataForCalculation.length) return;

        const currentConfigs = MovingAverageService.getConfigs();
        const currentMAIds = new Set(currentConfigs.map(generateMAId));
        
        // Remove series that are no longer in configs
        movingAverageSeriesRef.current.forEach((series, id) => {
            if (!currentMAIds.has(id)) {
                chartRef.current?.removeSeries(series);
                movingAverageSeriesRef.current.delete(id);
            }
        });

        // Calculate and add/update moving averages
        currentConfigs.forEach(config => {
            if (!config.visible) {
                const maId = generateMAId(config);
                const existingSeries = movingAverageSeriesRef.current.get(maId);
                if (existingSeries) {
                    chartRef.current?.removeSeries(existingSeries);
                    movingAverageSeriesRef.current.delete(maId);
                }
                return;
            }

            const maId = generateMAId(config);
            const existingSeries = movingAverageSeriesRef.current.get(maId);
            
            const maResult = MovingAverageService.calculateMovingAverage(dataForCalculation, config);
            
            if (maResult.data.length > 0) {
                if (existingSeries) {
                    existingSeries.applyOptions({
                        color: config.color,
                        lineWidth: config.lineWidth,
                        title: `${config.type.toUpperCase()}(${config.period})`,
                    });
                    existingSeries.setData(maResult.data);
                } else {
                    const maSeries = chartRef.current!.addLineSeries({
                        color: config.color,
                        lineWidth: config.lineWidth,
                        title: `${config.type.toUpperCase()}(${config.period})`,
                        priceScaleId: 'right',
                        lastValueVisible: true,
                        priceLineVisible: false,
                    });

                    maSeries.setData(maResult.data);
                    movingAverageSeriesRef.current.set(maId, maSeries);
                }
            }
        });
    }, [generateMAId]);

    // Handle real-time data updates
    useEffect(() => {
        if (!isRealTime || !realTimeData || !currentDataRef.current.length) return;

        const newDataTime = realTimeData.time;
        
        if (newDataTime <= lastProcessedTimeRef.current) {
            return;
        }

        lastProcessedTimeRef.current = newDataTime;

        const lastCandle = currentDataRef.current[currentDataRef.current.length - 1];
        const isSameCandle = lastCandle && lastCandle.time === realTimeData.time;
        
        if (isSameCandle) {
            currentDataRef.current[currentDataRef.current.length - 1] = realTimeData;
        } else {
            currentDataRef.current = [...currentDataRef.current, realTimeData];
        }

        if (seriesRef.current) {
            const formattedData = currentDataRef.current.map(item => ({
                time: (item.time / 1000) as Time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
            }));

            seriesRef.current.setData(formattedData);
        }

        calculateMovingAverages(currentDataRef.current);

        if (chartRef.current) {
            const timeScale = chartRef.current.timeScale();
            const visibleRange = timeScale.getVisibleLogicalRange();
            
            if (visibleRange && visibleRange.to > currentDataRef.current.length - 10) {
                timeScale.scrollToPosition(0, false);
            }
        }

        setViewportVersion(prev => prev + 1);

    }, [realTimeData, isRealTime, calculateMovingAverages]);

    // Update chart with initial data and when timeframe changes
    useEffect(() => {
        if (!seriesRef.current || !data.length) return;

        currentDataRef.current = [...data];
        
        const formattedData = data.map(item => ({
            time: (item.time / 1000) as Time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        seriesRef.current.setData(formattedData);
        calculateMovingAverages(data);
        
        if (chartRef.current && formattedData.length > 0) {
            chartRef.current.timeScale().fitContent();
        }
        
        setViewportVersion(prev => prev + 1);
        
        if (data.length > 0) {
            lastProcessedTimeRef.current = data[data.length - 1].time;
        }
    }, [data, timeframe, calculateMovingAverages]);

    // Update moving averages when configs change
    useEffect(() => {
        if (isChartReady && currentDataRef.current.length > 0) {
            calculateMovingAverages(currentDataRef.current);
        }
    }, [movingAverageConfigs, isChartReady, calculateMovingAverages]);

    // Handle moving average configuration changes
    const handleMovingAveragesUpdate = useCallback((newConfigs: MovingAverageConfig[]) => {
        MovingAverageService.setConfigs(newConfigs);
    }, []);

    const toggleMovingAverageVisibility = useCallback((index: number) => {
        const newConfigs = [...movingAverageConfigs];
        newConfigs[index] = {
            ...newConfigs[index],
            visible: !newConfigs[index].visible
        };
        MovingAverageService.setConfigs(newConfigs);
    }, [movingAverageConfigs]);

    const addMovingAverage = useCallback((config: MovingAverageConfig) => {
        MovingAverageService.addConfig({ ...config, visible: true });
    }, []);

    const removeMovingAverage = useCallback((index: number) => {
        MovingAverageService.removeConfig(index);
    }, []);

    const updateMovingAverage = useCallback((index: number, config: MovingAverageConfig) => {
        MovingAverageService.updateConfig(index, config);
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
            
            <MovingAverageControls
                configs={movingAverageConfigs}
                onConfigsUpdate={handleMovingAveragesUpdate}
                onToggleVisibility={toggleMovingAverageVisibility}
                onAddMovingAverage={addMovingAverage}
                onUpdateMovingAverage={updateMovingAverage}
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