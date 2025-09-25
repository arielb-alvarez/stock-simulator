// DrawingTools.tsx - Replace the entire component with this fixed version
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Drawing } from '../types';

interface DrawingToolsProps {
  activeTool: string | null;
  onToolSelect: (tool: string | null) => void;
  chart: IChartApi | undefined;
  series: ISeriesApi<'Candlestick'> | undefined;
  drawings: Drawing[];
  onDrawingsUpdate: (drawings: Drawing[]) => void;
  theme: 'light' | 'dark';
  isChartReady: boolean;
  chartDimensions: { width: number; height: number };
  visibleRange: { from: number; to: number } | null;
}

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
  '#00FFFF', '#FFA500', '#800080', '#008000', '#000080',
  '#FFFFFF', '#000000', '#FFC0CB', '#A52A2A', '#808080',
];

const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const DrawingTools: React.FC<DrawingToolsProps> = ({
  activeTool,
  onToolSelect,
  chart,
  series,
  drawings,
  onDrawingsUpdate,
  theme,
  isChartReady,
  chartDimensions,
  visibleRange
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState(theme === 'dark' ? '#FFFFFF' : '#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lineWidth, setLineWidth] = useState(2);
  const drawingLayerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Safe chart access function
  const isChartValid = useCallback(() => {
    return chart && !(chart as any)._internal_disposed && series;
  }, [chart, series]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isChartValid() && isChartReady) {
      setChartReady(true);
    } else {
      setChartReady(false);
    }
  }, [chart, series, isChartReady, isChartValid]);

  const safeTimeToCoordinate = useCallback((time: number): number | null => {
    if (!isChartValid() || !chart?.timeScale()) return null;
    
    try {
      const chartTime = (time / 1000) as UTCTimestamp;
      const coord = chart.timeScale().timeToCoordinate(chartTime);
      
      // Check if coordinate is valid and within visible range
      if (coord === null || coord === undefined || isNaN(coord)) {
        return null;
      }
      
      // Also check if the time is within the current visible time scale range
      const timeScale = chart.timeScale();
      const visibleRange = timeScale.getVisibleRange();
      
      if (visibleRange) {
        const visibleFrom = (visibleRange.from as number) * 1000;
        const visibleTo = (visibleRange.to as number) * 1000;
        
        // If time is outside visible range by a small margin, still render it
        // This prevents drawings from disappearing during zoom/scroll
        const buffer = (visibleTo - visibleFrom) * 0.1; // 10% buffer
        if (time < visibleFrom - buffer || time > visibleTo + buffer) {
          return null;
        }
      }
      
      return coord;
    } catch (error) {
      console.warn('Error converting time to coordinate:', error);
      return null;
    }
  }, [chart, isChartValid]);

  const safeCoordinateToTime = useCallback((coordinate: number): number | null => {
    if (!isChartValid() || !chart?.timeScale()) return null;
    try {
      const time = chart.timeScale().coordinateToTime(coordinate);
      return time !== null && !isNaN(time as number) ? (time as number) * 1000 : null;
    } catch (error) {
      console.warn('Error converting coordinate to time:', error);
      return null;
    }
  }, [chart, isChartValid]);

  const coordinateToPrice = useCallback((coordinate: number): number | null => {
    if (!isChartValid()) return null;
    try {
      const price = series!.coordinateToPrice(coordinate);
      return price !== null && !isNaN(price) ? price : null;
    } catch (error) {
      if (!(chart as any)._internal_disposed) {
        console.error('Error converting coordinate to price:', error);
      }
      return null;
    }
  }, [series, isChartValid]);

  const priceToCoordinate = useCallback((price: number): number | null => {
    if (!isChartValid()) return null;
    try {
      const coord = series!.priceToCoordinate(price);
      return coord !== null && !isNaN(coord) ? coord : null;
    } catch (error) {
      if (!(chart as any)._internal_disposed) {
        console.error('Error converting price to coordinate:', error);
      }
      return null;
    }
  }, [series, isChartValid]);

  const getMousePosition = (e: React.MouseEvent) => {
    if (!chartReady || !drawingLayerRef.current) return null;
    
    const rect = drawingLayerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = safeCoordinateToTime(x);
    const price = coordinateToPrice(y);
    
    if (time === null || price === null) return null;
    
    return { x, y, time, price };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeTool || activeTool === 'eraser' || !chartReady) return;
    
    // Only prevent default for drawing tools, allow chart interactions otherwise
    if (activeTool) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const pos = getMousePosition(e);
    if (!pos) return;

    setIsDrawing(true);

    const newDrawing: Drawing = {
      id: Date.now().toString(),
      type: activeTool as any,
      points: [{ time: pos.time, price: pos.price }],
      color: selectedColor,
      width: lineWidth
    };
    setCurrentDrawing(newDrawing);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Only interfere if we're actively drawing
    if (!isDrawing || !currentDrawing || !chartReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    if (currentDrawing.type === 'freehand') {
      const updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    } else if (currentDrawing.points.length === 1) {
      const updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    } else if (currentDrawing.points.length === 2) {
      const updatedDrawing = {
        ...currentDrawing,
        points: [currentDrawing.points[0], { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!currentDrawing) return;
    
    if (isDrawing) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsDrawing(false);

    if (currentDrawing.points && currentDrawing.points.length > 0) {
      let completedDrawing: Drawing;
      
      if (currentDrawing.type !== 'freehand' && currentDrawing.points.length === 1) {
        // For shapes that need exactly 2 points but user only clicked once
        completedDrawing = {
          ...currentDrawing,
          points: [currentDrawing.points[0], currentDrawing.points[0]], // Duplicate point
          createdAt: Date.now()
        };
      } else {
        completedDrawing = {
          ...currentDrawing,
          createdAt: Date.now()
        };
      }
      
      // Add the new drawing to the existing ones and save
      const updatedDrawings = [...drawings, completedDrawing];
      onDrawingsUpdate(updatedDrawings);
    }
    
    setCurrentDrawing(null);
  };

  const handleDrawingUpdate = (updatedDrawings: Drawing[]) => {
    // Filter out any invalid drawings before saving
    const validDrawings = updatedDrawings.filter(drawing => 
      drawing && 
      drawing.id && 
      drawing.type && 
      drawing.points && 
      Array.isArray(drawing.points) &&
      drawing.points.length > 0
    );
    
    onDrawingsUpdate(validDrawings);
  };

  const handleEraserClick = (e: React.MouseEvent) => {
    if (activeTool !== 'eraser' || !chartReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    const updatedDrawings = drawings.filter(drawing => {
      if (!drawing.points) return false;
      
      // Check if any point in the drawing is near the click position
      const isNear = drawing.points.some(point => {
        const pointX = safeTimeToCoordinate(point.time);
        const pointY = priceToCoordinate(point.price);
        return pointX !== null && pointY !== null && 
              Math.abs(pointX - pos.x) < 10 && Math.abs(pointY - pos.y) < 10;
      });
      
      return !isNear; // Keep drawings that are NOT near the click
    });
    
    handleDrawingUpdate(updatedDrawings);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  const handleLineWidthChange = (width: number) => {
    setLineWidth(width);
  };

  // Debounce chart dimensions and visible range to prevent excessive re-renders
  const debouncedDimensions = useDebounce(chartDimensions, 100);
  const debouncedVisibleRange = useDebounce(visibleRange, 150);

  const renderDrawings = useCallback(() => {
    if (!chartReady || chartDimensions.width === 0 || chartDimensions.height === 0) {
      return null;
    }

    // Filter and validate drawings more robustly
    const validDrawings = drawings.filter(drawing => 
      drawing && 
      drawing.id && 
      drawing.type && 
      drawing.points && 
      Array.isArray(drawing.points) &&
      drawing.points.length > 0 &&
      drawing.points.every(point => 
        point && 
        point.time !== undefined && 
        point.price !== undefined &&
        !isNaN(point.time) && 
        !isNaN(point.price) &&
        point.time > 0 && // Ensure time is positive
        point.price > 0   // Ensure price is positive
      )
    );

    return (
      <svg
        width={chartDimensions.width}
        height={chartDimensions.height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
        key={`drawings-${chartDimensions.width}-${chartDimensions.height}-${Date.now()}`} // More reliable key
      >
        {validDrawings.map(drawing => {
          try {
            // Convert all points to current coordinate system
            const coordinates = drawing.points.map(point => ({
              x: safeTimeToCoordinate(point.time),
              y: priceToCoordinate(point.price)
            }));
            
            // Filter out points that are not currently visible but keep at least 2 points for shapes
            const validCoordinates = coordinates.filter(coord => 
              coord.x !== null && coord.y !== null && 
              !isNaN(coord.x!) && !isNaN(coord.y!)
            );
            
            if (validCoordinates.length === 0) {
              return null;
            }
            
            // For shapes that need exactly 2 points, ensure we have enough coordinates
            if ((drawing.type === 'line' || drawing.type === 'rectangle' || drawing.type === 'circle') && 
                validCoordinates.length < 2) {
              // If we don't have enough points, try to use the original points with fallback
              const fallbackCoords = coordinates.map(coord => ({
                x: coord.x || 0,
                y: coord.y || 0
              }));
              
              if (fallbackCoords.length >= 2) {
                return renderDrawingShape(drawing, fallbackCoords);
              }
              return null;
            }
            
            return renderDrawingShape(drawing, validCoordinates as {x: number, y: number}[]);
          } catch (error) {
            console.warn('Error rendering drawing:', error);
            return null;
          }
        })}
        
        {/* Current drawing in progress */}
        {currentDrawing && renderCurrentDrawing()}
      </svg>
    );
  }, [debouncedDimensions, debouncedVisibleRange, drawings, chartReady, isChartValid]);

  // helper function for rendering drawing shapes
  const renderDrawingShape = (drawing: Drawing, coordinates: {x: number, y: number}[]) => {
    switch (drawing.type) {
      case 'freehand':
        return (
          <polyline
            key={drawing.id}
            points={coordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        );
        
      case 'line':
        return (
          <line
            key={drawing.id}
            x1={coordinates[0].x}
            y1={coordinates[0].y}
            x2={coordinates[coordinates.length - 1].x}
            y2={coordinates[coordinates.length - 1].y}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            vectorEffect="non-scaling-stroke"
          />
        );
        
      case 'rectangle':
        return (
          <rect
            key={drawing.id}
            x={Math.min(coordinates[0].x, coordinates[1].x)}
            y={Math.min(coordinates[0].y, coordinates[1].y)}
            width={Math.abs(coordinates[1].x - coordinates[0].x)}
            height={Math.abs(coordinates[1].y - coordinates[0].y)}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        );
        
      case 'circle':
        return (
          <circle
            key={drawing.id}
            cx={coordinates[0].x}
            cy={coordinates[0].y}
            r={Math.sqrt(
              Math.pow(coordinates[1].x - coordinates[0].x, 2) + 
              Math.pow(coordinates[1].y - coordinates[0].y, 2)
            )}
            stroke={drawing.color}
            strokeWidth={drawing.width}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        );
        
      default:
        return null;
    }
  };

  // helper function for rendering current drawing
  const renderCurrentDrawing = () => {
    if (!currentDrawing || !currentDrawing.points || currentDrawing.points.length === 0) {
      return null;
    }

    const coordinates = currentDrawing.points.map(point => ({
      x: safeTimeToCoordinate(point.time) || 0,
      y: priceToCoordinate(point.price) || 0
    }));

    return renderDrawingShape(
      { ...currentDrawing, id: 'current' }, 
      coordinates
    );
  };

  const renderColorPicker = () => {
    if (!showColorPicker) return null;

    return (
      <div
        ref={colorPickerRef}
        style={{
          position: 'absolute',
          top: '50px',
          left: '120px',
          background: theme === 'dark' ? '#2a2e39' : '#ffffff',
          border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
          borderRadius: '8px',
          padding: '10px',
          zIndex: 1000, // Very high z-index to ensure it's above everything
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '200px'
        }}
      >
        <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
          Select Color
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '5px',
          marginBottom: '10px'
        }}>
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: `2px solid ${selectedColor === color ? (theme === 'dark' ? '#fff' : '#000') : 'transparent'}`,
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              title={color}
            />
          ))}
        </div>
        
        <div style={{ marginBottom: '10px', fontSize: '12px', fontWeight: 'bold' }}>
          Line Width: {lineWidth}px
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={lineWidth}
          onChange={(e) => handleLineWidthChange(parseInt(e.target.value))}
          style={{ width: '100%' }}
        />
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginTop: '10px',
          padding: '5px',
          border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
          borderRadius: '4px',
          background: selectedColor
        }}>
          <span style={{ 
            color: parseInt(selectedColor.replace('#', ''), 16) > 0x7FFFFF ? '#000' : '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
            flex: 1,
            textAlign: 'center'
          }}>
            {selectedColor}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="drawing-tools">
      {/* Toolbar */}
      <div className="tools" style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 100,
        background: theme === 'dark' ? '#2a2e39' : '#ffffff',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        pointerEvents: 'auto'
      }}>
        <button 
          className={activeTool === 'line' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'line' ? null : 'line')}
          style={{ 
            padding: '5px 8px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            background: activeTool === 'line' ? (theme === 'dark' ? '#555' : '#eee') : 'transparent',
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Line
        </button>
        <button 
          className={activeTool === 'rectangle' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'rectangle' ? null : 'rectangle')}
          style={{ 
            padding: '5px 8px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            background: activeTool === 'rectangle' ? (theme === 'dark' ? '#555' : '#eee') : 'transparent',
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Rectangle
        </button>
        <button 
          className={activeTool === 'circle' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'circle' ? null : 'circle')}
          style={{ 
            padding: '5px 8px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            background: activeTool === 'circle' ? (theme === 'dark' ? '#555' : '#eee') : 'transparent',
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Circle
        </button>
        <button 
          className={activeTool === 'freehand' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'freehand' ? null : 'freehand')}
          style={{ 
            padding: '5px 8px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            background: activeTool === 'freehand' ? (theme === 'dark' ? '#555' : '#eee') : 'transparent',
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Pen
        </button>
        <button 
          className={activeTool === 'eraser' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'eraser' ? null : 'eraser')}
          style={{ 
            padding: '5px 8px',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            background: activeTool === 'eraser' ? (theme === 'dark' ? '#555' : '#eee') : 'transparent',
            color: theme === 'dark' ? '#fff' : '#000',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Eraser
        </button>
        
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button 
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ 
              padding: '5px 8px',
              border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
              background: 'transparent',
              color: theme === 'dark' ? '#fff' : '#000',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: selectedColor,
              border: `1px solid ${theme === 'dark' ? '#fff' : '#000'}`,
              borderRadius: '2px'
            }} />
            Color
          </button>
          {renderColorPicker()}
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          marginLeft: '5px',
          fontSize: '12px',
          color: theme === 'dark' ? '#fff' : '#000'
        }}>
          <span>Width: {lineWidth}px</span>
        </div>
      </div>
      
      {/* Drawing Layer - CRITICAL FIXES */}
      {chartReady && (
        <div 
          ref={drawingLayerRef}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: chartDimensions.width,
            height: chartDimensions.height,
            cursor: isDrawing ? 'crosshair' : 'default',
            pointerEvents: activeTool && !showColorPicker ? 'auto' : 'none',
            zIndex: 2,
            backgroundColor: 'transparent'
          }}
          onMouseDown={activeTool ? (activeTool === 'eraser' ? handleEraserClick : handleMouseDown) : undefined}
          onMouseMove={isDrawing ? handleMouseMove : undefined}
          onMouseUp={isDrawing ? handleMouseUp : undefined}
          onMouseLeave={isDrawing ? handleMouseUp : undefined}
        >
          {renderDrawings()}
        </div>
      )}
    </div>
  );
};

export default DrawingTools;