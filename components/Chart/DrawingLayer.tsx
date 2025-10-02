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

    // FIXED: Tool selection handler - only handle tool selection, not color picker
    const handleToolSelect = useCallback((tool: string | null) => {
        // Toggle off if the same tool is clicked again
        if (activeTool === tool) {
            setActiveTool(null);
        } else {
            setActiveTool(tool);
        }
        // Always close color picker when changing tools
        setShowColorPicker(false);
    }, [activeTool]);

    // FIXED: Color picker toggle handler
    const handleColorPickerToggle = useCallback(() => {
        setShowColorPicker(prev => !prev);
    }, []);

    // FIXED: Color selection handler - don't change active tool
    const handleColorSelect = useCallback((color: string) => {
        setSelectedColor(color);
        // Keep the color picker open after selection for potential further adjustments
        // setShowColorPicker(false); // Removed this line to keep picker open
    }, []);

    const handleLineWidthChange = useCallback((width: number) => {
        setLineWidth(width);
    }, []);

    // FIXED: Close color picker handler
    const handleColorPickerClose = useCallback(() => {
        setShowColorPicker(false);
    }, []);

    // NEW: Right-click handler to deactivate active tool
    const handleRightClick = useCallback((e: React.MouseEvent) => {
        // Only handle if there's an active tool or color picker is open
        if (activeTool || showColorPicker) {
            e.preventDefault(); // Prevent default context menu
            e.stopPropagation();
            
            setActiveTool(null);
            setShowColorPicker(false);
            
            // If we were in the middle of drawing, cancel it
            if (isDrawing) {
                setIsDrawing(false);
                setCurrentDrawing(null);
            }
        }
    }, [activeTool, showColorPicker, isDrawing]);

    useEffect(() => {
        if (!chart || !series) return;

        let timeoutId: NodeJS.Timeout;
  
        const handleViewportChange = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setViewportVersion(prev => prev + 1);
            }, 50);
        };

        const handleContainerMouseUp = () => {
            handleViewportChange();
        };

        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
        timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
        
        chart.subscribeCrosshairMove(handleViewportChange);
        chart.subscribeClick(handleViewportChange);

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
            return isNaN(timeInMs) ? null : { time: timeInMs, price, x, y };
        } catch (error) {
            console.error('Error converting coordinates:', error);
            return null;
        }
    };

    // Unified function to get position from both mouse and touch events
    const getEventPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!chart || !series || !chartContainerRef.current) return null;

        const rect = chartContainerRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;

        if ('touches' in e) {
            // Touch event
            if (e.touches.length === 0) return null;
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            // Mouse event
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        return validateAndConvertPoint(chart, series, x, y);
    }, [chart, series, chartContainerRef]);

    const handleDrawingStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        // FIXED: Don't start drawing if color picker is open
        if (!activeTool || activeTool === 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        // Prevent default for touch events to avoid scrolling
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
            createdAt: Date.now()
        };

        setCurrentDrawing(newDrawing);
    }, [activeTool, getEventPosition, selectedColor, lineWidth, showColorPicker]);

    const handleDrawingMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !currentDrawing || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        // Prevent default for touch events to avoid scrolling
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

        // Prevent default for touch events
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

    // Helper functions (remain the same)
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

    const handleEraserAction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        // Prevent default for touch events
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
    }, [activeTool, getEventPosition, drawings, onDrawingsUpdate, chart, series, showColorPicker]);

    // FIXED: Handle tool deactivation when clicking outside - improved logic
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            // Don't deactivate tool if we're currently drawing
            if (isDrawingRef.current) return;
            
            // Don't deactivate if eraser is active
            if (isEraserActiveRef.current) return;
            
            if (!activeToolRef.current) return;
            
            // If click is outside the chart container and outside color picker/toolbar
            if (chartContainerRef.current && !chartContainerRef.current.contains(e.target as Node)) {
                setActiveTool(null);
                setShowColorPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [chartContainerRef]);

    // Add continuous eraser functionality for mouse move
    const handleEraserMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        // For mouse events, only handle eraser on move if left button is pressed
        if ('button' in e && e.type === 'mousemove' && e.buttons !== 1) return;
        
        handleEraserAction(e);
    }, [activeTool, handleEraserAction, showColorPicker]);

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
                    onToolSelect={handleToolSelect}
                    selectedColor={selectedColor}
                    lineWidth={lineWidth}
                    onColorPickerToggle={handleColorPickerToggle} // FIXED: Use dedicated toggle handler
                    showColorPicker={showColorPicker}
                    theme={config.theme}
                    isMobile={isMobile}
                />
            </div>

            {showColorPicker && (
                <div style={{
                    position: 'absolute',
                    top: isMobile ? 'auto' : '60px',
                    bottom: isMobile ? '60px' : 'auto',
                    left: isMobile ? '50%' : '10px',
                    transform: isMobile ? 'translateX(-50%)' : 'none',
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
                        onClose={handleColorPickerClose} // FIXED: Use dedicated close handler
                    />
                </div>
            )}

            {/* Single Drawing Surface with both mouse and touch support */}
            {chart && series && chartDimensions.width > 0 && chartDimensions.height > 0 && (
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        // FIXED: Disable pointer events when color picker is open
                        pointerEvents: (activeTool && !showColorPicker) ? 'auto' : 'none',
                        cursor: activeTool === 'eraser' ? 'crosshair' : 
                               (activeTool && !showColorPicker && !isDrawing) ? 'crosshair' : 'default',
                        zIndex: 15,
                        // Important for mobile touch events
                        touchAction: (activeTool && !showColorPicker) ? 'none' : 'auto',
                    }}
                    onMouseDown={(e) => {
                        // FIXED: Don't handle drawing/eraser when color picker is open
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
                    // NEW: Right-click handler to deactivate tools
                    onContextMenu={handleRightClick}
                    // Touch events for mobile
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
                </div>
            )}
        </>
    );
};

export default DrawingLayer;