import React, { useRef, useState, useCallback, useEffect } from 'react';
import { 
  createChart, 
  IChartApi, 
  ISeriesApi,
  Time
} from 'lightweight-charts';
import { CandleStickData, ChartConfig, Drawing } from '../../types';
import { MovingAverageConfig, MovingAverageService } from '../../services/MovingAverageService';
import RSIService, { RSIConfig } from '../../services/RSIService';
import ChartContainer from './ChartContainer';
import DrawingLayer from './DrawingLayer';
import MovingAverageControls from './MovingAverageControls';
import RSIControls from './RSIControls';

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
    const rsiChartRef = useRef<IChartApi>();
    const rsiSeriesRef = useRef<ISeriesApi<'Line'>>();
    
    const movingAverageSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    const rsiSeriesMapRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
    
    const [isChartReady, setIsChartReady] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
    const [viewportVersion, setViewportVersion] = useState(0);
    
    const lastProcessedTimeRef = useRef<number>(0);
    const currentDataRef = useRef<CandleStickData[]>([]);
    
    const [movingAverageConfigs, setMovingAverageConfigs] = useState<MovingAverageConfig[]>(
        MovingAverageService.getConfigs()
    );

    const [rsiConfigs, setRSIConfigs] = useState<RSIConfig[]>(
        RSIService.getConfigs()
    );

    // Initialize currentDataRef when data prop changes
    useEffect(() => {
        currentDataRef.current = [...data];
        if (data.length > 0) {
            lastProcessedTimeRef.current = data[data.length - 1].time;
        }
    }, [data]);

    // Subscribe to moving average configuration changes
    useEffect(() => {
        const unsubscribe = MovingAverageService.subscribeToConfigChanges((newConfigs) => {
            setMovingAverageConfigs([...newConfigs]);
        });
        
        return unsubscribe;
    }, []);

    // Subscribe to RSI configuration changes
    useEffect(() => {
        const unsubscribe = RSIService.subscribeToConfigChanges((newConfigs) => {
            setRSIConfigs([...newConfigs]);
        });
        
        return unsubscribe;
    }, []);

    // Generate MA ID function
    const generateMAId = useCallback((config: MovingAverageConfig): string => {
        return `${config.type}-${config.period}-${config.priceSource}`;
    }, []);

    // Safe time scale synchronization
    const syncTimeScales = useCallback(() => {
        if (!chartRef.current || !rsiChartRef.current) return;

        try {
            const mainTimeScale = chartRef.current.timeScale();
            const rsiTimeScale = rsiChartRef.current.timeScale();
            
            const mainRange = mainTimeScale.getVisibleRange();
            const rsiRange = rsiTimeScale.getVisibleRange();
            
            if (mainRange && rsiRange) {
                // Convert to numbers to ensure TypeScript recognizes them as numeric types
                const mainFrom = Number(mainRange.from);
                const mainTo = Number(mainRange.to);
                const rsiFrom = Number(rsiRange.from);
                const rsiTo = Number(rsiRange.to);
                
                // Only sync if they're significantly different to avoid infinite loops
                const timeDiff = Math.abs(mainFrom - rsiFrom) + Math.abs(mainTo - rsiTo);
                if (timeDiff > 60) { // 1 minute threshold
                    rsiTimeScale.setVisibleRange(mainRange);
                }
            }
        } catch (error) {
            console.warn('Time scale sync error:', error);
        }
    }, []);

    // Initialize chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        let resizeObserver: ResizeObserver;
        let mainChart: IChartApi;
        let rsiChart: IChartApi;

        const initializeCharts = () => {
            // Clear existing content
            if (chartContainerRef.current) {
                chartContainerRef.current.innerHTML = '';
            }

            // Create main chart container
            const mainChartContainer = document.createElement('div');
            mainChartContainer.style.width = '100%';
            mainChartContainer.style.height = '70%';

            // Create RSI chart container
            const rsiChartContainer = document.createElement('div');
            rsiChartContainer.style.width = '100%';
            rsiChartContainer.style.height = '30%';

            // Add containers to parent
            if (chartContainerRef.current) {
                chartContainerRef.current.appendChild(mainChartContainer);
                chartContainerRef.current.appendChild(rsiChartContainer);
            } else {
                return; // Exit if ref is null
            }

            // Get container dimensions with null checks
            const mainContainerWidth = mainChartContainer.clientWidth || 800;
            const mainContainerHeight = mainChartContainer.clientHeight || 400;
            const rsiContainerWidth = rsiChartContainer.clientWidth || 800;
            const rsiContainerHeight = rsiChartContainer.clientHeight || 200;

            // Create main chart
            mainChart = createChart(mainChartContainer, {
                layout: {
                    background: { topColor: 'solid', color: config.theme === 'dark' ? '#131722' : '#FFFFFF' },
                    textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
                    fontSize: isMobile ? 12 : 14,
                },
                width: mainContainerWidth,
                height: mainContainerHeight,
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
                    mode: 1,
                    vertLine: {
                        width: 1,
                        color: config.theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                        style: 2,
                        labelBackgroundColor: config.theme === 'dark' ? '#131722' : '#FFFFFF',
                    },
                    horzLine: {
                        width: 1,
                        color: config.theme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                        style: 2,
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

            const series = mainChart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceScaleId: 'right',
            });

            // Create RSI chart
            rsiChart = createChart(rsiChartContainer, {
                layout: {
                    background: { topColor: 'solid', color: config.theme === 'dark' ? '#131722' : '#FFFFFF' },
                    textColor: config.theme === 'dark' ? '#D9D9D9' : '#191919',
                    fontSize: isMobile ? 10 : 12,
                },
                width: rsiContainerWidth,
                height: rsiContainerHeight,
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderVisible: false,
                },
                rightPriceScale: {
                    borderVisible: false,
                    scaleMargins: {
                        top: 0.1,
                        bottom: 0.1,
                    },
                },
                grid: {
                    vertLines: { visible: false },
                    horzLines: { visible: true, color: config.theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                },
                crosshair: {
                    mode: 1,
                },
                handleScroll: {
                    mouseWheel: false,
                    pressedMouseMove: false,
                    horzTouchDrag: false,
                    vertTouchDrag: false,
                },
                handleScale: {
                    axisPressedMouseMove: false,
                    mouseWheel: false,
                    pinch: false,
                },
            });

            // Set references only if charts were created
            if (mainChart && rsiChart) {
                chartRef.current = mainChart;
                seriesRef.current = series;
                rsiChartRef.current = rsiChart;
                setIsChartReady(true);
            }

            // Set up time scale synchronization after charts are ready
            setTimeout(() => {
                if (mainChart && rsiChart) {
                    const mainTimeScale = mainChart.timeScale();
                    const rsiTimeScale = rsiChart.timeScale();

                    // Sync from main to RSI
                    mainTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                        if (timeRange && rsiChartRef.current) {
                            try {
                                rsiChartRef.current.timeScale().setVisibleRange(timeRange);
                            } catch (error) {
                                console.warn('Failed to sync time range to RSI chart:', error);
                            }
                        }
                    });

                    // Sync from RSI to main (with protection)
                    rsiTimeScale.subscribeVisibleTimeRangeChange((timeRange) => {
                        if (timeRange && chartRef.current) {
                            try {
                                // Only sync if the main chart has data
                                const mainRange = chartRef.current.timeScale().getVisibleRange();
                                if (mainRange) {
                                    chartRef.current.timeScale().setVisibleRange(timeRange);
                                }
                            } catch (error) {
                                console.warn('Failed to sync time range from RSI chart:', error);
                            }
                        }
                    });
                }
            }, 100);

            setIsChartReady(true);
        };

        const updateDimensions = () => {
            if (chartContainerRef.current && mainChart && rsiChart) {
                const width = chartContainerRef.current.clientWidth || 800;
                const height = chartContainerRef.current.clientHeight || 600;
                setChartDimensions({ width, height });
                
                const mainHeight = Math.floor(height * 0.7);
                const rsiHeight = Math.floor(height * 0.3);
                
                mainChart.applyOptions({ 
                    width, 
                    height: mainHeight,
                });
                
                rsiChart.applyOptions({ 
                    width, 
                    height: rsiHeight,
                });
                
                // Fit content only if we have data
                if (currentDataRef.current.length > 0) {
                    mainChart.timeScale().fitContent();
                }
            }
        };

        initializeCharts();
        updateDimensions();

        // Set up resize observer with null check
        if (chartContainerRef.current) {
            resizeObserver = new ResizeObserver(updateDimensions);
            resizeObserver.observe(chartContainerRef.current);
        }

        const handleViewportChange = () => {
            setViewportVersion(prev => prev + 1);
        };

        const handleWheel = () => {
            setTimeout(handleViewportChange, 100);
        };
        
        if (chartContainerRef.current) {
            chartContainerRef.current.addEventListener('wheel', handleWheel, { passive: true });
        }

        return () => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }

            // Clean up charts only if they were created
            if (mainChart) {
                movingAverageSeriesRef.current.forEach((series) => {
                    mainChart!.removeSeries(series);
                });
                mainChart.remove();
            }
            
            if (rsiChart) {
                rsiSeriesMapRef.current.forEach((series) => {
                    rsiChart!.removeSeries(series);
                });
                rsiChart.remove();
            }
            
            movingAverageSeriesRef.current.clear();
            rsiSeriesMapRef.current.clear();
            setIsChartReady(false);
        };
    }, [config.theme, isMobile]);

    // Enhanced moving average calculation
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
                        lineWidth: config.lineWidth as any,
                        title: `${config.type.toUpperCase()}(${config.period})`,
                    });
                    existingSeries.setData(maResult.data);
                } else {
                    const maSeries = chartRef.current!.addLineSeries({
                        color: config.color,
                        lineWidth: config.lineWidth as any,
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

    // RSI calculation and rendering
    const calculateRSI = useCallback((dataForCalculation: CandleStickData[]) => {
        if (!rsiChartRef.current || !dataForCalculation.length) return;

        const currentConfigs = RSIService.getConfigs();
        const currentRSIIds = new Set(currentConfigs.map(config => config.id));
        
        // Remove series that are no longer in configs
        rsiSeriesMapRef.current.forEach((series, id) => {
            if (!currentRSIIds.has(id)) {
                rsiChartRef.current?.removeSeries(series);
                rsiSeriesMapRef.current.delete(id);
            }
        });

        // Calculate and add/update RSI
        currentConfigs.forEach(config => {
            if (!config.visible) {
                const existingSeries = rsiSeriesMapRef.current.get(config.id);
                if (existingSeries) {
                    rsiChartRef.current?.removeSeries(existingSeries);
                    rsiSeriesMapRef.current.delete(config.id);
                }
                return;
            }

            const rsiData = RSIService.calculateRSI(dataForCalculation, config.period);
            
            if (rsiData.length > 0) {
                const existingSeries = rsiSeriesMapRef.current.get(config.id);
                
                const formattedData = rsiData.map(item => ({
                    time: (item.time / 1000) as Time,
                    value: item.value
                }));

                if (existingSeries) {
                    existingSeries.applyOptions({
                        color: config.color,
                        lineWidth: 1 as const,
                        lineStyle: 2 as const,
                        title: `RSI(${config.period})`,
                    });
                    existingSeries.setData(formattedData);
                } else {
                    const rsiSeries = rsiChartRef.current!.addLineSeries({
                        color: config.color,
                        lineWidth: 1 as const,
                        lineStyle: 2 as const,
                        title: `RSI(${config.period})`,
                        priceScaleId: 'right',
                        lastValueVisible: true,
                        priceLineVisible: false,
                    });

                    rsiSeries.setData(formattedData);
                    rsiSeriesMapRef.current.set(config.id, rsiSeries);

                    // Add overbought and oversold lines
                    try {
                        // Overbought line
                        const overboughtLine = rsiChartRef.current!.addLineSeries({
                            color: '#ff6b6b',
                            lineWidth: 1,
                            lineStyle: 2, // Dashed
                            title: 'Overbought',
                            priceScaleId: 'right',
                            lastValueVisible: false,
                            priceLineVisible: false,
                        });
                        overboughtLine.setData(
                            formattedData.map(item => ({
                                time: item.time,
                                value: config.overbought
                            }))
                        );

                        // Oversold line
                        const oversoldLine = rsiChartRef.current!.addLineSeries({
                            color: '#51cf66',
                            lineWidth: 1,
                            lineStyle: 2, // Dashed
                            title: 'Oversold',
                            priceScaleId: 'right',
                            lastValueVisible: false,
                            priceLineVisible: false,
                        });
                        oversoldLine.setData(
                            formattedData.map(item => ({
                                time: item.time,
                                value: config.oversold
                            }))
                        );
                    } catch (error) {
                        console.warn('Failed to add RSI reference lines:', error);
                    }
                }
            }
        });

        // Sync time scales after RSI data is loaded
        setTimeout(syncTimeScales, 50);
    }, [syncTimeScales]);

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
        calculateRSI(currentDataRef.current);

        if (chartRef.current) {
            const timeScale = chartRef.current.timeScale();
            const visibleRange = timeScale.getVisibleLogicalRange();
            
            if (visibleRange && visibleRange.to > currentDataRef.current.length - 10) {
                timeScale.scrollToPosition(0, false);
            }
        }

        setViewportVersion(prev => prev + 1);

    }, [realTimeData, isRealTime, calculateMovingAverages, calculateRSI]);

    // Update chart with initial data and when timeframe changes
    useEffect(() => {
        if (!seriesRef.current || !data || data.length === 0) return;

        currentDataRef.current = [...data];
        
        // Safe data formatting with validation
        const formattedData = data
            .filter(item => item && 
                typeof item.time === 'number' && 
                !isNaN(item.time) &&
                typeof item.open === 'number' &&
                typeof item.high === 'number' &&
                typeof item.low === 'number' &&
                typeof item.close === 'number'
            )
            .map(item => ({
                time: (item.time / 1000) as Time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
            }));

        if (formattedData.length > 0) {
            seriesRef.current.setData(formattedData);
            calculateMovingAverages(data);
            calculateRSI(data);
            
            if (chartRef.current) {
                setTimeout(() => {
                    try {
                        chartRef.current?.timeScale().fitContent();
                        syncTimeScales();
                    } catch (error) {
                        console.warn('Error fitting content:', error);
                    }
                }, 100);
            }
            
            setViewportVersion(prev => prev + 1);
            lastProcessedTimeRef.current = data[data.length - 1].time;
        }
    }, [data, timeframe, calculateMovingAverages, calculateRSI, syncTimeScales]);

    // Update moving averages when configs change
    useEffect(() => {
        if (isChartReady && currentDataRef.current.length > 0) {
            calculateMovingAverages(currentDataRef.current);
        }
    }, [movingAverageConfigs, isChartReady, calculateMovingAverages]);

    // Update RSI when configs change
    useEffect(() => {
        if (isChartReady && currentDataRef.current.length > 0) {
            calculateRSI(currentDataRef.current);
        }
    }, [rsiConfigs, isChartReady, calculateRSI]);

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

    // RSI configuration handlers
    const handleRSIUpdate = useCallback((id: string, config: RSIConfig) => {
        RSIService.updateConfig(id, config);
    }, []);

    const toggleRSIVisibility = useCallback((id: string) => {
        RSIService.toggleVisibility(id);
    }, []);

    const removeRSI = useCallback((id: string) => {
        RSIService.removeConfig(id);
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
            
            <RSIControls
                configs={rsiConfigs}
                onConfigsUpdate={() => {}}
                onToggleVisibility={toggleRSIVisibility}
                onUpdateRSI={handleRSIUpdate}
                onRemoveRSI={removeRSI}
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