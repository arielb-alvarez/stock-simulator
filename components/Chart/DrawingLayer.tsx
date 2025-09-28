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

  // Listen to chart viewport changes
  useEffect(() => {
    if (!chart) return;

    const handleViewportChange = () => {
      setViewportVersion(prev => prev + 1);
    };

    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleTimeRangeChange(handleViewportChange);
    timeScale.subscribeVisibleLogicalRangeChange(handleViewportChange);
    chart.subscribeCrosshairMove(handleViewportChange);

    return () => {
      timeScale.unsubscribeVisibleTimeRangeChange(handleViewportChange);
      timeScale.unsubscribeVisibleLogicalRangeChange(handleViewportChange);
      chart.unsubscribeCrosshairMove(handleViewportChange);
    };
  }, [chart]);

  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!chart || !series || !chartContainerRef.current) return null;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const time = chart.timeScale().coordinateToTime(x);
      if (time === null) return null;
      
      const price = series.coordinateToPrice(y);
      if (price === null || isNaN(price)) return null;

      const timeInMs = timeToMilliseconds(time);
      return isNaN(timeInMs) ? null : { x, y, time: timeInMs, price };
    } catch (error) {
      console.error('Error getting mouse position:', error);
      return null;
    }
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

  const handleEraserClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'eraser') return;
    
    const pos = getMousePosition(e);
    if (!pos) return;

    e.preventDefault();
    e.stopPropagation();

    const drawingsToRemove = new Set<string>();
    
    drawings.forEach(drawing => {
      drawing.points.forEach(point => {
        try {
          const pointX = chart.timeScale().timeToCoordinate(point.time / 1000 as UTCTimestamp);
          const pointY = series.priceToCoordinate(point.price);
          
          if (pointX !== null && pointY !== null && 
              Math.abs(pointX - pos.x) < 15 && Math.abs(pointY - pos.y) < 15) {
            drawingsToRemove.add(drawing.id);
          }
        } catch (error) {
          console.error('Error in eraser calculation:', error);
        }
      });
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
            cursor: activeTool && !isDrawing ? 'crosshair' : 'default',
            pointerEvents: activeTool ? 'auto' : 'none',
            zIndex: 15,
          }}
          onMouseDown={activeTool === 'eraser' ? handleEraserClick : handleMouseDown}
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
        </div>
      )}
    </>
  );
};

export default DrawingLayer;