// components/DrawingLayer.tsx
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Drawing, ChartConfig } from '../../types';
import Toolbar from './../DrawingTools/Toolbar';
import ColorPicker from './../DrawingTools/ColorPicker';
import DrawingSurface from './../DrawingTools/DrawingSurface';
import DrawingService, { Point } from '../../services/DrawingService';

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
    
    const isDrawingRef = useRef(false);
    const activeToolRef = useRef(activeTool);

    // Sync refs with state
    useEffect(() => {
        isDrawingRef.current = isDrawing;
        activeToolRef.current = activeTool;
    }, [isDrawing, activeTool]);

    // Viewport change handler
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

        const forceUpdate = () => {
            setViewportVersion(prev => prev + 1);
        };

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
    }, [chart, series, timeframe]);

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

        return DrawingService.validateAndConvertPoint(x, y, chart, series);
    }, [chart, series, chartContainerRef]);

    const handleDrawingStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!activeTool || activeTool === 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setIsDrawing(true);

        const newDrawing = DrawingService.createNewDrawing(
            activeTool,
            pos,
            selectedColor,
            lineWidth
        );

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

        const isFreehand = currentDrawing.type === 'freehand';
        const updatedDrawing = DrawingService.updateDrawingPoints(
            currentDrawing,
            pos,
            isFreehand
        );

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

    // Eraser functionality
    const handleEraserAction = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        const pos = getEventPosition(e);
        if (!pos) return;

        if ('touches' in e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        const screenX = clientX - rect.left;
        const screenY = clientY - rect.top;

        const drawingsToRemove = DrawingService.findDrawingsToRemove(
            pos,
            screenX,
            screenY,
            drawings,
            chart,
            series,
            15
        );

        if (drawingsToRemove.length > 0) {
            const updatedDrawings = drawings.filter(drawing => !drawingsToRemove.includes(drawing.id));
            onDrawingsUpdate(updatedDrawings);
        }
    }, [activeTool, getEventPosition, drawings, onDrawingsUpdate, chart, series, showColorPicker, chartContainerRef]);

    // Continuous eraser functionality
    const handleEraserMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (activeTool !== 'eraser' || showColorPicker) return;
        
        if ('button' in e && e.type === 'mousemove' && e.buttons !== 1) return;
        
        handleEraserAction(e);
    }, [activeTool, handleEraserAction, showColorPicker]);

    // Tool selection handler
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