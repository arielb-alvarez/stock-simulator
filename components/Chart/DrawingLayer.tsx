import React, { useState, useCallback, useEffect } from 'react';
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Drawing, ChartConfig } from '../../types';
import Toolbar from './../DrawingTools/Toolbar';
import ColorPicker from './../DrawingTools/ColorPicker';
import DrawingSurface from './../DrawingTools/DrawingSurface';

interface DrawingLayerProps {
    chart: IChartApi;
    series: ISeriesApi<'Candlestick'>;
    drawings: Drawing[];
    onDrawingsUpdate: (drawings: Drawing[]) => void;
    config: ChartConfig;
    timeframe: string;
    isMobile: boolean;
    chartDimensions: { width: number; height: number };
    chartContainerRef: React.RefObject<HTMLDivElement>;
}

const timeToMilliseconds = (time: any): number => {
    if (typeof time === 'number') return time * 1000;
    if (typeof time === 'string') return new Date(time).getTime();
    return Date.now();
};

const DrawingLayer: React.FC<DrawingLayerProps> = ({
  chart,
  series,
  drawings,
  onDrawingsUpdate,
  config,
  timeframe,
  isMobile,
  chartDimensions,
  chartContainerRef,
}) => {
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [selectedColor, setSelectedColor] = useState(config.theme === 'dark' ? '#CCCCCC' : '#000000');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [lineWidth, setLineWidth] = useState(2);
    const [viewportVersion, setViewportVersion] = useState(0);

    useEffect(() => {
        if (!chart || !series) return;

        let timeoutId: NodeJS.Timeout;
  
        const handleViewportChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
            setViewportVersion(prev => prev + 1);
            }, 50); // Debounce to 50ms
        };

        // Track mouse events that typically occur during price scale adjustment
        const handleContainerMouseUp = () => {
            // Price scale adjustments usually end with mouse up
            handleViewportChange();
        };

        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
        
        // These events often trigger during price scale manipulation
        chart.subscribeCrosshairMove(handleViewportChange);
        chart.subscribeClick(handleViewportChange);

        // Add mouse up listener to the chart container
        const chartContainer = chartContainerRef.current;
        if (chartContainer) {
            chartContainer.addEventListener('mouseup', handleContainerMouseUp);
            chartContainer.addEventListener('touchend', handleContainerMouseUp);
        }

        return () => {
            clearTimeout(timeoutId);
            timeScale.unsubscribeVisibleTimeRangeChange(handleViewportChange);
            timeScale.unsubscribeVisibleLogicalRangeChange(handleViewportChange);
            chart.unsubscribeCrosshairMove(handleViewportChange);
            chart.unsubscribeClick(handleViewportChange);
            
            if (chartContainer) {
            chartContainer.removeEventListener('mouseup', handleContainerMouseUp);
            chartContainer.removeEventListener('touchend', handleContainerMouseUp);
            }
        };
    }, [chart, series, chartContainerRef]);

    const validateAndConvertPoint = (
        chart: IChartApi, 
        series: ISeriesApi<'Candlestick'>, 
        x: number, 
        y: number
    ) => {
        try {
            const time = chart.timeScale().coordinateToTime(x);
            if (time === null) return null;
            
            const price = series.coordinateToPrice(y);
            if (price === null || isNaN(price)) return null;

            const timeInMs = timeToMilliseconds(time);
            return isNaN(timeInMs) ? null : { time: timeInMs, price, x, y }; // FIX: Include x and y coordinates
        } catch (error) {
            console.error('Error converting coordinates:', error);
            return null;
        }
    };

    const getMousePosition = useCallback((e: React.MouseEvent) => {
        if (!chart || !series || !chartContainerRef.current) return null;

        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        return validateAndConvertPoint(chart, series, x, y);
    }, [chart, series, chartContainerRef]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!activeTool || activeTool === 'eraser') return;
        
        const pos = getMousePosition(e);
        if (!pos) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(true);

        const newDrawing: Drawing = {
        id: `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: activeTool as any,
        points: [{ time: pos.time, price: pos.price }],
        color: selectedColor,
        width: lineWidth,
        createdAt: Date.now()
        };

        setCurrentDrawing(newDrawing);
    }, [activeTool, getMousePosition, selectedColor, lineWidth]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDrawing || !currentDrawing) return;
        
        const pos = getMousePosition(e);
        if (!pos) return;

        e.preventDefault();
        e.stopPropagation();

        let updatedDrawing: Drawing;
        
        if (currentDrawing.type === 'freehand') {
        updatedDrawing = {
            ...currentDrawing,
            points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
        };
        } else {
        updatedDrawing = {
            ...currentDrawing,
            points: currentDrawing.points.length === 1 
            ? [...currentDrawing.points, { time: pos.time, price: pos.price }]
            : [currentDrawing.points[0], { time: pos.time, price: pos.price }]
        };
        }

        setCurrentDrawing(updatedDrawing);
    }, [isDrawing, currentDrawing, getMousePosition]);

    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!isDrawing || !currentDrawing) return;

        e.preventDefault();
        e.stopPropagation();
        setIsDrawing(false);

        if (currentDrawing.points.length >= (currentDrawing.type === 'freehand' ? 2 : 1)) {
        onDrawingsUpdate([...drawings, currentDrawing]);
        }
        
        setCurrentDrawing(null);
    }, [isDrawing, currentDrawing, drawings, onDrawingsUpdate]);

    // Helper function to check if point is near a line segment
    const isPointNearLine = (
        px: number, py: number, 
        x1: number, y1: number, 
        x2: number, y2: number, 
        tolerance: number
    ): boolean => {
    // Calculate distance from point to line segment
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        
        if (lenSq !== 0) {
            param = dot / lenSq;
        }

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy) <= tolerance;
    };

    // Helper function to check if point is near a rectangle
    const isPointNearRectangle = (
        px: number, py: number,
        x1: number, y1: number,
        x2: number, y2: number,
        tolerance: number
    ): boolean => {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);

        // Check if point is inside expanded rectangle (including tolerance)
        const expandedMinX = minX - tolerance;
        const expandedMaxX = maxX + tolerance;
        const expandedMinY = minY - tolerance;
        const expandedMaxY = maxY + tolerance;

        return px >= expandedMinX && px <= expandedMaxX && 
                py >= expandedMinY && py <= expandedMaxY;
    };

    // Helper function to check if point is near a circle
    const isPointNearCircle = (
        px: number, py: number,
        cx: number, cy: number,
        radius: number,
        tolerance: number
    ): boolean => {
        const distance = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        return Math.abs(distance - radius) <= tolerance;
    };

    const handleEraserClick = useCallback((e: React.MouseEvent) => {
        if (activeTool !== 'eraser') return;
        
        const pos = getMousePosition(e);
        if (!pos) return;

        e.preventDefault();
        e.stopPropagation();

        const drawingsToRemove = new Set<string>();
        
        drawings.forEach(drawing => {
            let shouldRemove = false;

            // Different detection logic based on drawing type
            switch (drawing.type) {
            case 'freehand':
                // For freehand, check if any point is close to cursor
                shouldRemove = drawing.points.some(point => {
                try {
                    const pointX = chart.timeScale().timeToCoordinate(point.time / 1000 as UTCTimestamp);
                    const pointY = series.priceToCoordinate(point.price);
                    return pointX !== null && pointY !== null && 
                    Math.abs(pointX - pos.x!) < 20 && Math.abs(pointY - pos.y!) < 20;
                } catch (error) {
                    return false;
                }
                });
                break;

            case 'line':
                // For lines, check distance to line segment
                if (drawing.points.length === 2) {
                const [p1, p2] = drawing.points;
                const x1 = chart.timeScale().timeToCoordinate(p1.time / 1000 as UTCTimestamp);
                const y1 = series.priceToCoordinate(p1.price);
                const x2 = chart.timeScale().timeToCoordinate(p2.time / 1000 as UTCTimestamp);
                const y2 = series.priceToCoordinate(p2.price);
                
                if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                    shouldRemove = isPointNearLine(pos.x!, pos.y!, x1, y1, x2, y2, 15);
                }
                }
                break;

            case 'rectangle':
                // For rectangles, check if click is inside or near border
                if (drawing.points.length === 2) {
                const [p1, p2] = drawing.points;
                const x1 = chart.timeScale().timeToCoordinate(p1.time / 1000 as UTCTimestamp);
                const y1 = series.priceToCoordinate(p1.price);
                const x2 = chart.timeScale().timeToCoordinate(p2.time / 1000 as UTCTimestamp);
                const y2 = series.priceToCoordinate(p2.price);
                
                if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                    shouldRemove = isPointNearRectangle(pos.x!, pos.y!, x1, y1, x2, y2, 10);
                }
                }
                break;

            case 'circle':
                // For circles, check if click is inside or near circumference
                if (drawing.points.length === 2) {
                const [center, edge] = drawing.points;
                const centerX = chart.timeScale().timeToCoordinate(center.time / 1000 as UTCTimestamp);
                const centerY = series.priceToCoordinate(center.price);
                const edgeX = chart.timeScale().timeToCoordinate(edge.time / 1000 as UTCTimestamp);
                const edgeY = series.priceToCoordinate(edge.price);
                
                if (centerX !== null && centerY !== null && edgeX !== null && edgeY !== null) {
                    const radius = Math.sqrt(Math.pow(edgeX - centerX, 2) + Math.pow(edgeY - centerY, 2));
                    shouldRemove = isPointNearCircle(pos.x!, pos.y!, centerX, centerY, radius, 10);
                }
                }
                break;
            }

            if (shouldRemove) {
            drawingsToRemove.add(drawing.id);
            }
        });

        if (drawingsToRemove.size > 0) {
            const updatedDrawings = drawings.filter(drawing => !drawingsToRemove.has(drawing.id));
            onDrawingsUpdate(updatedDrawings);
        }
        }, [activeTool, getMousePosition, drawings, onDrawingsUpdate, chart, series]);

    // Handle tool deactivation when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
        if (!activeTool) return;
        
        if (chartContainerRef.current && !chartContainerRef.current.contains(e.target as Node)) {
            setActiveTool(null);
        }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeTool, chartContainerRef]);

    return (
        <>
            <div style={{
                position: 'absolute',
                top: isMobile ? 'auto' : '10px',
                bottom: isMobile ? '40px' : 'auto',
                left: isMobile ? '50%' : '10px',
                transform: isMobile ? 'translateX(-50%)' : 'none',
                zIndex: 20,
                pointerEvents: 'auto',
            }}>
                <Toolbar
                    activeTool={activeTool}
                    onToolSelect={setActiveTool}
                    selectedColor={selectedColor}
                    lineWidth={lineWidth}
                    onColorPickerToggle={() => setShowColorPicker(!showColorPicker)}
                    showColorPicker={showColorPicker}
                    theme={config.theme}
                    isMobile={isMobile}
                />
            </div>

            {showColorPicker && (
                <div style={{
                    position: 'absolute',
                    top: isMobile ? 'auto' : '60px', // Positioned below toolbar
                    bottom: isMobile ? '60px' : 'auto',
                    left: isMobile ? '50%' : '10px',
                    transform: isMobile ? 'translateX(-50%)' : 'none',
                    zIndex: 21,
                    pointerEvents: 'auto',
                }}>
                    <ColorPicker
                        selectedColor={selectedColor}
                        onColorSelect={setSelectedColor}
                        lineWidth={lineWidth}
                        onLineWidthChange={setLineWidth}
                        theme={config.theme}
                        isMobile={isMobile}
                        show={showColorPicker}
                        onClose={() => setShowColorPicker(false)}
                    />
                </div>
            )}

            {/* Single Drawing Surface */}
            {chart && series && chartDimensions.width > 0 && chartDimensions.height > 0 && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        // FIX: Only block events when we're actively using a tool
                        pointerEvents: activeTool ? 'auto' : 'none',
                        // Show crosshair only when tool is active but not currently drawing
                        cursor: activeTool && !isDrawing ? 'crosshair' : 'default',
                        zIndex: 15,
                    }}
                    onMouseDown={(e) => {
                        if (activeTool === 'eraser') {
                            handleEraserClick(e);
                        } else if (activeTool) {
                            handleMouseDown(e);
                        }
                    }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    <DrawingSurface
                    key={`drawing-surface-${viewportVersion}`}
                    chart={chart}
                    series={series}
                    drawings={drawings}
                    currentDrawing={currentDrawing}
                    chartDimensions={chartDimensions}
                    isDrawing={isDrawing}
                    activeTool={activeTool}
                    viewportVersion={viewportVersion}
                    />
                </div>)
            }
        </>
    );
};

export default DrawingLayer;