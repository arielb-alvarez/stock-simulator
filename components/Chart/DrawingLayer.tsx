import React, { useState, useCallback, useEffect, useRef } from 'react';
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

// FIXED: Use the exact same time format as your chart data
const normalizeTime = (time: any): UTCTimestamp => {
    if (typeof time === 'number') {
        // If it's already a UTCTimestamp (seconds), return it
        // If it's milliseconds, convert to seconds
        return time > 10000000000 ? Math.floor(time / 1000) as UTCTimestamp : time as UTCTimestamp;
    }
    if (typeof time === 'string') {
        return Math.floor(new Date(time).getTime() / 1000) as UTCTimestamp;
    }
    return Math.floor(Date.now() / 1000) as UTCTimestamp;
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
    
    // Add refs to track states
    const isDrawingRef = useRef(false);
    const isEraserActiveRef = useRef(false);
    const activeToolRef = useRef(activeTool);

    // Sync refs with state
    useEffect(() => {
        isDrawingRef.current = isDrawing;
        isEraserActiveRef.current = activeTool === 'eraser';
        activeToolRef.current = activeTool;
    }, [isDrawing, activeTool]);

    // FIXED: Enhanced viewport change handler with better timeframe detection
    useEffect(() => {
        if (!chart || !series) return;

        let timeoutId: NodeJS.Timeout;
  
        const handleViewportChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setViewportVersion(prev => prev + 1);
            }, 150);
        };

        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
        
        chart.subscribeCrosshairMove(handleViewportChange);

        // FIXED: More aggressive update on timeframe changes
        const forceUpdate = () => {
            setViewportVersion(prev => prev + 1);
        };

        // Force update after a short delay when component mounts or timeframe changes
        const initialUpdate = setTimeout(forceUpdate, 300);
        const timeframeUpdate = setTimeout(forceUpdate, 500);

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(initialUpdate);
            clearTimeout(timeframeUpdate);
            timeScale.unsubscribeVisibleTimeRangeChange(handleViewportChange);
            timeScale.unsubscribeVisibleLogicalRangeChange(handleViewportChange);
            chart.unsubscribeCrosshairMove(handleViewportChange);
        };
    }, [chart, series, timeframe]); // timeframe dependency

    // FIXED: Improved coordinate validation
    const validateAndConvertPoint = useCallback((
        x: number, 
        y: number
    ) => {
        if (!chart || !series) return null;
        
        try {
            const time = chart.timeScale().coordinateToTime(x);
            if (time === null) return null;
            
            const price = series.coordinateToPrice(y);
            if (price === null || isNaN(price)) return null;

            // FIXED: Use normalized time that matches chart data format
            const normalizedTime = normalizeTime(time);
            
            return { 
                time: normalizedTime, 
                price, 
                x, 
                y 
            };
        } catch (error) {
            console.error('Error converting coordinates:', error);
            return null;
        }
    }, [chart, series]);

    // Unified function to get position from both mouse and touch events
    const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!chart || !series || !chartContainerRef.current) return null;

        const rect = chartContainerRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in e) {
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        return validateAndConvertPoint(x, y);
    }, [chart, series, chartContainerRef, validateAndConvertPoint]);

    const handleDrawingStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!activeTool || activeTool === 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setIsDrawing(true);

        const newDrawing: Drawing = {
            id: `drawing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: activeTool as any,
            points: [{ time: pos.time, price: pos.price }],
            color: selectedColor,
            width: lineWidth,
            createdAt: normalizeTime(Date.now())
        };

        setCurrentDrawing(newDrawing);
    }, [activeTool, getEventPosition, selectedColor, lineWidth, showColorPicker]);

    const handleDrawingMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !currentDrawing || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

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
    }, [isDrawing, currentDrawing, getEventPosition, showColorPicker]);

    const handleDrawingEnd = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !currentDrawing) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setIsDrawing(false);

        if (currentDrawing.points.length >= (currentDrawing.type === 'freehand' ? 2 : 1)) {
            onDrawingsUpdate([...drawings, currentDrawing]);
        }
        
        setCurrentDrawing(null);
    }, [isDrawing, currentDrawing, drawings, onDrawingsUpdate]);

    // FIXED: Improved eraser action
    const handleEraserAction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const drawingsToRemove = new Set<string>();
        
        drawings.forEach(drawing => {
            let shouldRemove = false;

            switch (drawing.type) {
                case 'freehand':
                    shouldRemove = drawing.points.some(point => {
                        try {
                            const pointX = chart?.timeScale().timeToCoordinate(point.time as UTCTimestamp);
                            const pointY = series?.priceToCoordinate(point.price);
                            return pointX !== null && pointY !== null && 
                            Math.abs(pointX - pos.x!) < 20 && Math.abs(pointY - pos.y!) < 20;
                        } catch (error) {
                            return false;
                        }
                    });
                    break;

                case 'line':
                    if (drawing.points.length === 2) {
                        const [p1, p2] = drawing.points;
                        const x1 = chart?.timeScale().timeToCoordinate(p1.time as UTCTimestamp);
                        const y1 = series?.priceToCoordinate(p1.price);
                        const x2 = chart?.timeScale().timeToCoordinate(p2.time as UTCTimestamp);
                        const y2 = series?.priceToCoordinate(p2.price);
                        
                        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                            shouldRemove = isPointNearLine(pos.x!, pos.y!, x1, y1, x2, y2, 15);
                        }
                    }
                    break;

                case 'rectangle':
                    if (drawing.points.length === 2) {
                        const [p1, p2] = drawing.points;
                        const x1 = chart?.timeScale().timeToCoordinate(p1.time as UTCTimestamp);
                        const y1 = series?.priceToCoordinate(p1.price);
                        const x2 = chart?.timeScale().timeToCoordinate(p2.time as UTCTimestamp);
                        const y2 = series?.priceToCoordinate(p2.price);
                        
                        if (x1 !== null && y1 !== null && x2 !== null && y2 !== null) {
                            shouldRemove = isPointNearRectangle(pos.x!, pos.y!, x1, y1, x2, y2, 10);
                        }
                    }
                    break;

                case 'circle':
                    if (drawing.points.length === 2) {
                        const [center, edge] = drawing.points;
                        const centerX = chart?.timeScale().timeToCoordinate(center.time as UTCTimestamp);
                        const centerY = series?.priceToCoordinate(center.price);
                        const edgeX = chart?.timeScale().timeToCoordinate(edge.time as UTCTimestamp);
                        const edgeY = series?.priceToCoordinate(edge.price);
                        
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
    }, [activeTool, getEventPosition, drawings, onDrawingsUpdate, chart, series, showColorPicker]);

    // Helper functions (keep the same)
    const isPointNearLine = (
        px: number, py: number, 
        x1: number, y1: number, 
        x2: number, y2: number, 
        tolerance: number
    ): boolean => {
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

        const expandedMinX = minX - tolerance;
        const expandedMaxX = maxX + tolerance;
        const expandedMinY = minY - tolerance;
        const expandedMaxY = maxY + tolerance;

        return px >= expandedMinX && px <= expandedMaxX && 
                py >= expandedMinY && py <= expandedMaxY;
    };

    const isPointNearCircle = (
        px: number, py: number,
        cx: number, cy: number,
        radius: number,
        tolerance: number
    ): boolean => {
        const distance = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
        return Math.abs(distance - radius) <= tolerance;
    };

    // FIXED: Continuous eraser functionality
    const handleEraserMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        if ('button' in e && e.type === 'mousemove' && e.buttons !== 1) return;
        
        handleEraserAction(e);
    }, [activeTool, handleEraserAction, showColorPicker]);

    // FIXED: Tool selection handler
    const handleToolSelect = useCallback((tool: string | null) => {
        if (activeTool === tool) {
            setActiveTool(null);
        } else {
            setActiveTool(tool);
        }
        setShowColorPicker(false);
    }, [activeTool]);

    const handleColorPickerToggle = useCallback(() => {
        setShowColorPicker(prev => !prev);
    }, []);

    const handleColorSelect = useCallback((color: string) => {
        setSelectedColor(color);
    }, []);

    const handleLineWidthChange = useCallback((width: number) => {
        setLineWidth(width);
    }, []);

    const handleColorPickerClose = useCallback(() => {
        setShowColorPicker(false);
    }, []);

    const handleRightClick = useCallback((e: React.MouseEvent) => {
        if (activeTool || showColorPicker) {
            e.preventDefault();
            e.stopPropagation();
            
            setActiveTool(null);
            setShowColorPicker(false);
            
            if (isDrawing) {
                setIsDrawing(false);
                setCurrentDrawing(null);
            }
        }
    }, [activeTool, showColorPicker, isDrawing]);

    return (
        <>
            <div style={{
                position: 'absolute',
                top: '0',
                left: '0',
                zIndex: 20,
                pointerEvents: 'auto',
                height: '100%',
            }}>
                <Toolbar
                    activeTool={activeTool}
                    onToolSelect={handleToolSelect}
                    selectedColor={selectedColor}
                    lineWidth={lineWidth}
                    onColorPickerToggle={handleColorPickerToggle}
                    showColorPicker={showColorPicker}
                    theme={config.theme}
                    isMobile={isMobile}
                />
            </div>

            {showColorPicker && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 21,
                    pointerEvents: 'auto',
                }}>
                    <ColorPicker
                        selectedColor={selectedColor}
                        onColorSelect={handleColorSelect}
                        lineWidth={lineWidth}
                        onLineWidthChange={handleLineWidthChange}
                        theme={config.theme}
                        isMobile={isMobile}
                        show={showColorPicker}
                        onClose={handleColorPickerClose}
                    />
                </div>
            )}

            {/* FIXED: Enhanced drawing surface with better timeframe handling */}
            {chart && series && chartDimensions.width > 0 && chartDimensions.height > 0 && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: "calc(100% - 76px)",
                        height: "calc(100% - 28px)",
                        pointerEvents: (activeTool && !showColorPicker) ? 'auto' : 'none',
                        cursor: activeTool === 'eraser' ? 'crosshair' : 
                               (activeTool && !showColorPicker && !isDrawing) ? 'crosshair' : 'default',
                        zIndex: 15,
                        touchAction: (activeTool && !showColorPicker) ? 'none' : 'auto',
                    }}
                    onMouseDown={(e) => {
                        if (showColorPicker) return;
                        
                        if (activeTool === 'eraser') {
                            handleEraserAction(e);
                        } else if (activeTool) {
                            handleDrawingStart(e);
                        }
                    }}
                    onMouseMove={(e) => {
                        if (showColorPicker) return;
                        
                        if (activeTool === 'eraser') {
                            handleEraserMove(e);
                        } else {
                            handleDrawingMove(e);
                        }
                    }}
                    onMouseUp={handleDrawingEnd}
                    onMouseLeave={handleDrawingEnd}
                    onContextMenu={handleRightClick}
                    onTouchStart={(e) => {
                        if (showColorPicker) return;
                        
                        if (activeTool === 'eraser') {
                            handleEraserAction(e);
                        } else if (activeTool) {
                            handleDrawingStart(e);
                        }
                    }}
                    onTouchMove={(e) => {
                        if (showColorPicker) return;
                        
                        if (activeTool === 'eraser') {
                            handleEraserAction(e);
                        } else {
                            handleDrawingMove(e);
                        }
                    }}
                    onTouchEnd={handleDrawingEnd}
                    onTouchCancel={handleDrawingEnd}
                >
                    <DrawingSurface
                        key={`drawing-surface-${viewportVersion}-${timeframe}-${chartDimensions.width}x${chartDimensions.height}`}
                        chart={chart}
                        series={series}
                        drawings={drawings}
                        currentDrawing={currentDrawing}
                        chartDimensions={chartDimensions}
                        isDrawing={isDrawing}
                        activeTool={activeTool}
                        viewportVersion={viewportVersion}
                    />
                </div>
            )}
        </>
    );
};

export default DrawingLayer;