// DrawingTools.tsx - Fixed version with real-time drawing
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
  const svgKeyRef = useRef(0); // Force SVG re-renders

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
      
      if (coord === null || coord === undefined || isNaN(coord)) {
        return null;
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
      return null;
    }
  }, [series, isChartValid]);

  const priceToCoordinate = useCallback((price: number): number | null => {
    if (!isChartValid()) return null;
    try {
      const coord = series!.priceToCoordinate(price);
      return coord !== null && !isNaN(coord) ? coord : null;
    } catch (error) {
      return null;
    }
  }, [series, isChartValid]);

  const getMousePosition = useCallback((e: React.MouseEvent) => {
    if (!chartReady || !drawingLayerRef.current) return null;
    
    const rect = drawingLayerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = safeCoordinateToTime(x);
    const price = coordinateToPrice(y);
    
    if (time === null || price === null) return null;
    
    return { x, y, time, price };
  }, [chartReady, safeCoordinateToTime, coordinateToPrice]);

  // CRITICAL FIX: Improved mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool || activeTool === 'eraser' || !chartReady) return;
    
    const pos = getMousePosition(e);
    if (!pos) return;

    // Prevent event propagation to allow drawing
    e.preventDefault();
    e.stopPropagation();

    setIsDrawing(true);

    const newDrawing: Drawing = {
      id: `drawing-${Date.now()}`,
      type: activeTool as any,
      points: [{ time: pos.time, price: pos.price }],
      color: selectedColor,
      width: lineWidth,
      createdAt: Date.now()
    };
    setCurrentDrawing(newDrawing);
    
    // Force SVG re-render
    svgKeyRef.current++;
  }, [activeTool, chartReady, getMousePosition, selectedColor, lineWidth]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing || !chartReady) return;
    
    const pos = getMousePosition(e);
    if (!pos) return;

    e.preventDefault();
    e.stopPropagation();

    let updatedDrawing: Drawing;

    if (currentDrawing.type === 'freehand') {
      // For freehand, keep adding points
      updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
    } else {
      // For shapes, update the second point
      if (currentDrawing.points.length === 1) {
        updatedDrawing = {
          ...currentDrawing,
          points: [currentDrawing.points[0], { time: pos.time, price: pos.price }]
        };
      } else {
        updatedDrawing = {
          ...currentDrawing,
          points: [currentDrawing.points[0], { time: pos.time, price: pos.price }]
        };
      }
    }

    setCurrentDrawing(updatedDrawing);
    // Force re-render on every mouse move
    svgKeyRef.current++;
  }, [isDrawing, currentDrawing, chartReady, getMousePosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDrawing(false);

    // Only save if we have valid points
    if (currentDrawing.points && currentDrawing.points.length > 0) {
      const completedDrawing: Drawing = {
        ...currentDrawing,
        createdAt: Date.now()
      };
      
      // Add the new drawing to the existing ones
      const updatedDrawings = [...drawings, completedDrawing];
      onDrawingsUpdate(updatedDrawings);
    }
    
    setCurrentDrawing(null);
    svgKeyRef.current++;
  }, [isDrawing, currentDrawing, drawings, onDrawingsUpdate]);

  const handleEraserClick = useCallback((e: React.MouseEvent) => {
    if (activeTool !== 'eraser' || !chartReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    const updatedDrawings = drawings.filter(drawing => {
      if (!drawing.points) return false;
      
      const isNear = drawing.points.some(point => {
        const pointX = safeTimeToCoordinate(point.time);
        const pointY = priceToCoordinate(point.price);
        return pointX !== null && pointY !== null && 
              Math.abs(pointX - pos.x) < 10 && Math.abs(pointY - pos.y) < 10;
      });
      
      return !isNear;
    });
    
    onDrawingsUpdate(updatedDrawings);
  }, [activeTool, chartReady, getMousePosition, drawings, onDrawingsUpdate, safeTimeToCoordinate, priceToCoordinate]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  const handleLineWidthChange = (width: number) => {
    setLineWidth(width);
  };

  // Render current drawing in real-time
  const renderCurrentDrawing = useCallback(() => {
    if (!currentDrawing || !currentDrawing.points || currentDrawing.points.length === 0) {
      return null;
    }

    try {
      const coordinates = currentDrawing.points.map(point => ({
        x: safeTimeToCoordinate(point.time) || 0,
        y: priceToCoordinate(point.price) || 0
      })).filter(coord => coord.x !== null && coord.y !== null);

      if (coordinates.length === 0) return null;

      switch (currentDrawing.type) {
        case 'freehand':
          if (coordinates.length < 2) return null;
          return (
            <polyline
              key="current-freehand"
              points={coordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
              stroke={currentDrawing.color}
              strokeWidth={currentDrawing.width}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
          
        case 'line':
          if (coordinates.length < 2) return null;
          return (
            <line
              key="current-line"
              x1={coordinates[0].x}
              y1={coordinates[0].y}
              x2={coordinates[1].x}
              y2={coordinates[1].y}
              stroke={currentDrawing.color}
              strokeWidth={currentDrawing.width}
              vectorEffect="non-scaling-stroke"
            />
          );
          
        case 'rectangle':
          if (coordinates.length < 2) return null;
          return (
            <rect
              key="current-rect"
              x={Math.min(coordinates[0].x, coordinates[1].x)}
              y={Math.min(coordinates[0].y, coordinates[1].y)}
              width={Math.abs(coordinates[1].x - coordinates[0].x)}
              height={Math.abs(coordinates[1].y - coordinates[0].y)}
              stroke={currentDrawing.color}
              strokeWidth={currentDrawing.width}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
          
        case 'circle':
          if (coordinates.length < 2) return null;
          return (
            <circle
              key="current-circle"
              cx={coordinates[0].x}
              cy={coordinates[0].y}
              r={Math.sqrt(
                Math.pow(coordinates[1].x - coordinates[0].x, 2) + 
                Math.pow(coordinates[1].y - coordinates[0].y, 2)
              )}
              stroke={currentDrawing.color}
              strokeWidth={currentDrawing.width}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
          
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error rendering current drawing:', error);
      return null;
    }
  }, [currentDrawing, safeTimeToCoordinate, priceToCoordinate]);

  // Render saved drawings
  const renderSavedDrawings = useCallback(() => {
    if (!chartReady || chartDimensions.width === 0 || chartDimensions.height === 0) {
      return null;
    }

    const validDrawings = drawings.filter(drawing => 
      drawing && 
      drawing.id && 
      drawing.type && 
      drawing.points && 
      Array.isArray(drawing.points) &&
      drawing.points.length > 0
    );

    return validDrawings.map(drawing => {
      try {
        const coordinates = drawing.points.map(point => ({
          x: safeTimeToCoordinate(point.time),
          y: priceToCoordinate(point.price)
        })).filter(coord => coord.x !== null && coord.y !== null) as {x: number, y: number}[];

        if (coordinates.length === 0) return null;

        switch (drawing.type) {
          case 'freehand':
            if (coordinates.length < 2) return null;
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
            if (coordinates.length < 2) return null;
            return (
              <line
                key={drawing.id}
                x1={coordinates[0].x}
                y1={coordinates[0].y}
                x2={coordinates[1].x}
                y2={coordinates[1].y}
                stroke={drawing.color}
                strokeWidth={drawing.width}
                vectorEffect="non-scaling-stroke"
              />
            );
            
          case 'rectangle':
            if (coordinates.length < 2) return null;
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
            if (coordinates.length < 2) return null;
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
      } catch (error) {
        console.warn('Error rendering drawing:', error);
        return null;
      }
    });
  }, [drawings, chartReady, chartDimensions, safeTimeToCoordinate, priceToCoordinate]);

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
          zIndex: 1000,
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
      
      {/* Drawing Layer - FIXED EVENT HANDLING */}
      {chartReady && (
        <div 
          ref={drawingLayerRef}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: chartDimensions.width,
            height: chartDimensions.height,
            cursor: isDrawing ? 'crosshair' : (activeTool ? 'crosshair' : 'default'),
            pointerEvents: activeTool && !showColorPicker ? 'auto' : 'none',
            zIndex: 2,
            backgroundColor: 'transparent'
          }}
          onMouseDown={activeTool ? (activeTool === 'eraser' ? handleEraserClick : handleMouseDown) : undefined}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* SVG for drawings - FIXED RE-RENDERING */}
          <svg
            width={chartDimensions.width}
            height={chartDimensions.height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none'
            }}
            key={`drawings-${svgKeyRef.current}`} // Force re-render on every update
          >
            {/* Saved drawings */}
            {renderSavedDrawings()}
            {/* Current drawing in progress */}
            {renderCurrentDrawing()}
          </svg>
        </div>
      )}
    </div>
  );
};

export default DrawingTools;