// DrawingTools.tsx
import React, { useEffect, useRef, useState } from 'react';
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
}

// Color palette options
const COLOR_PALETTE = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFA500', // Orange
  '#800080', // Purple
  '#008000', // Dark Green
  '#000080', // Navy
  '#FFFFFF', // White
  '#000000', // Black
  '#FFC0CB', // Pink
  '#A52A2A', // Brown
  '#808080', // Gray
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
  chartDimensions
}) => {
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const [selectedColor, setSelectedColor] = useState(theme === 'dark' ? '#FFFFFF' : '#000000');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [lineWidth, setLineWidth] = useState(2);
  const drawingLayerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
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
    if (chart && series && isChartReady) {
      setChartReady(true);
    } else {
      setChartReady(false);
    }
  }, [chart, series, isChartReady]);

  // Safe time conversion function
  const safeTimeToCoordinate = (time: number): number | null => {
    if (!chart || !chart.timeScale()) return null;
    try {
      const chartTime = (time / 1000) as UTCTimestamp;
      const coord = chart.timeScale().timeToCoordinate(chartTime);
      return coord !== null && coord !== undefined && !isNaN(coord) ? coord : null;
    } catch (error) {
      console.error('Error converting time to coordinate:', error);
      return null;
    }
  };

  // Safe coordinate to time conversion
  const safeCoordinateToTime = (coordinate: number): number | null => {
    if (!chart || !chart.timeScale()) return null;
    try {
      const time = chart.timeScale().coordinateToTime(coordinate);
      return time !== null && !isNaN(time as number) ? (time as number) * 1000 : null;
    } catch (error) {
      console.error('Error converting coordinate to time:', error);
      return null;
    }
  };

  // Get price from coordinate
  const coordinateToPrice = (coordinate: number): number | null => {
    if (!series) return null;
    try {
      const price = series.coordinateToPrice(coordinate);
      return price !== null && !isNaN(price) ? price : null;
    } catch (error) {
      console.error('Error converting coordinate to price:', error);
      return null;
    }
  };

  // Get coordinate from price
  const priceToCoordinate = (price: number): number | null => {
    if (!series) return null;
    try {
      const coord = series.priceToCoordinate(price);
      return coord !== null && !isNaN(coord) ? coord : null;
    } catch (error) {
      console.error('Error converting price to coordinate:', error);
      return null;
    }
  };

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
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    setIsDrawing(true);

    // Start new drawing with selected color and line width
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
    if (!isDrawing || !currentDrawing || !chartReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    // For freehand drawing, add a new point
    if (currentDrawing.type === 'freehand') {
      const updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    } 
    // For other drawing types, update the second point
    else if (currentDrawing.points.length === 1) {
      const updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    } 
    // If we already have two points, update the second one
    else if (currentDrawing.points.length === 2) {
      const updatedDrawing = {
        ...currentDrawing,
        points: [currentDrawing.points[0], { time: pos.time, price: pos.price }]
      };
      setCurrentDrawing(updatedDrawing);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!currentDrawing) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDrawing(false);

    // Ensure we have valid points before saving
    if (currentDrawing.points && currentDrawing.points.length > 0) {
      // For non-freehand drawings, ensure we have exactly 2 points
      if (currentDrawing.type !== 'freehand' && currentDrawing.points.length === 1) {
        // If we only have one point, duplicate it to create a valid shape
        const completedDrawing = {
          ...currentDrawing,
          points: [currentDrawing.points[0], currentDrawing.points[0]]
        };
        onDrawingsUpdate([...drawings, completedDrawing]);
      } else {
        onDrawingsUpdate([...drawings, currentDrawing]);
      }
    }
    
    setCurrentDrawing(null);
  };

  const handleEraserClick = (e: React.MouseEvent) => {
    if (activeTool !== 'eraser' || !chartReady) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getMousePosition(e);
    if (!pos) return;

    // Find and remove drawing at this position
    const updatedDrawings = drawings.filter(drawing => {
      if (!drawing.points) return true;
      
      // Simple hit detection
      return !drawing.points.some(point => {
        const pointX = safeTimeToCoordinate(point.time);
        const pointY = priceToCoordinate(point.price);
        return pointX !== null && pointY !== null && 
               Math.abs(pointX - pos.x) < 10 && Math.abs(pointY - pos.y) < 10;
      });
    });
    
    onDrawingsUpdate(updatedDrawings);
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setShowColorPicker(false);
  };

  const handleLineWidthChange = (width: number) => {
    setLineWidth(width);
  };

  const renderDrawings = () => {
    if (!chartReady || chartDimensions.width === 0 || chartDimensions.height === 0) {
      return null;
    }

    const validDrawings = drawings.filter(drawing => 
      drawing && 
      drawing.id && 
      drawing.points && 
      drawing.points.length > 0 &&
      drawing.points.every(point => 
        point.time !== undefined && 
        point.price !== undefined &&
        !isNaN(point.time) &&
        !isNaN(point.price)
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
      >
        {validDrawings.map(drawing => {
          const coordinates = drawing.points.map(point => ({
            x: safeTimeToCoordinate(point.time),
            y: priceToCoordinate(point.price)
          }));
          
          if (coordinates.some(coord => coord.x === null || coord.y === null || isNaN(coord.x!) || isNaN(coord.y!))) {
            return null;
          }
          
          const validCoordinates = coordinates.map(coord => ({
            x: coord.x as number,
            y: coord.y as number
          }));
          
          return (
            <g key={drawing.id}>
              {drawing.type === 'freehand' && validCoordinates.length > 1 && (
                <polyline
                  points={validCoordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
                  stroke={drawing.color}
                  strokeWidth={drawing.width}
                  fill="none"
                />
              )}
              {drawing.type === 'line' && validCoordinates.length === 2 && (
                <line
                  x1={validCoordinates[0].x}
                  y1={validCoordinates[0].y}
                  x2={validCoordinates[1].x}
                  y2={validCoordinates[1].y}
                  stroke={drawing.color}
                  strokeWidth={drawing.width}
                />
              )}
              {drawing.type === 'rectangle' && validCoordinates.length === 2 && (
                <rect
                  x={Math.min(validCoordinates[0].x, validCoordinates[1].x)}
                  y={Math.min(validCoordinates[0].y, validCoordinates[1].y)}
                  width={Math.abs(validCoordinates[1].x - validCoordinates[0].x)}
                  height={Math.abs(validCoordinates[1].y - validCoordinates[0].y)}
                  stroke={drawing.color}
                  strokeWidth={drawing.width}
                  fill="none"
                />
              )}
              {drawing.type === 'circle' && validCoordinates.length === 2 && (
                <circle
                  cx={validCoordinates[0].x}
                  cy={validCoordinates[0].y}
                  r={Math.sqrt(
                    Math.pow(validCoordinates[1].x - validCoordinates[0].x, 2) + 
                    Math.pow(validCoordinates[1].y - validCoordinates[0].y, 2)
                  )}
                  stroke={drawing.color}
                  strokeWidth={drawing.width}
                  fill="none"
                />
              )}
            </g>
          );
        })}
        
        {/* Render current drawing (in progress) */}
        {currentDrawing && currentDrawing.points && currentDrawing.points.length > 0 && (
          <g key={`current-${currentDrawing.id}`}>
            {currentDrawing.type === 'freehand' && currentDrawing.points.length > 1 && (
              <polyline
                points={currentDrawing.points.map(point => {
                  const x = safeTimeToCoordinate(point.time);
                  const y = priceToCoordinate(point.price);
                  return x !== null && y !== null && !isNaN(x) && !isNaN(y) ? `${x},${y}` : '0,0';
                }).join(' ')}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.width}
                fill="none"
              />
            )}
            {currentDrawing.type === 'line' && currentDrawing.points.length === 2 && (
              <line
                x1={safeTimeToCoordinate(currentDrawing.points[0].time) || 0}
                y1={priceToCoordinate(currentDrawing.points[0].price) || 0}
                x2={safeTimeToCoordinate(currentDrawing.points[1].time) || 0}
                y2={priceToCoordinate(currentDrawing.points[1].price) || 0}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.width}
              />
            )}
            {currentDrawing.type === 'rectangle' && currentDrawing.points.length === 2 && (
              <rect
                x={Math.min(
                  safeTimeToCoordinate(currentDrawing.points[0].time) || 0,
                  safeTimeToCoordinate(currentDrawing.points[1].time) || 0
                )}
                y={Math.min(
                  priceToCoordinate(currentDrawing.points[0].price) || 0,
                  priceToCoordinate(currentDrawing.points[1].price) || 0
                )}
                width={Math.abs(
                  (safeTimeToCoordinate(currentDrawing.points[1].time) || 0) - 
                  (safeTimeToCoordinate(currentDrawing.points[0].time) || 0)
                )}
                height={Math.abs(
                  (priceToCoordinate(currentDrawing.points[1].price) || 0) - 
                  (priceToCoordinate(currentDrawing.points[0].price) || 0)
                )}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.width}
                fill="none"
              />
            )}
            {currentDrawing.type === 'circle' && currentDrawing.points.length === 2 && (
              <circle
                cx={safeTimeToCoordinate(currentDrawing.points[0].time) || 0}
                cy={priceToCoordinate(currentDrawing.points[0].price) || 0}
                r={Math.sqrt(
                  Math.pow(
                    (safeTimeToCoordinate(currentDrawing.points[1].time) || 0) - 
                    (safeTimeToCoordinate(currentDrawing.points[0].time) || 0), 2) + 
                  Math.pow((priceToCoordinate(currentDrawing.points[1].price) || 0) - 
                          (priceToCoordinate(currentDrawing.points[0].price) || 0), 2)
                )}
                stroke={currentDrawing.color}
                strokeWidth={currentDrawing.width}
                fill="none"
              />
            )}
          </g>
        )}
      </svg>
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
          zIndex: 30,
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
      <div className="tools" style={{ 
        position: 'absolute', 
        top: '10px', 
        left: '10px', 
        zIndex: 20,
        background: theme === 'dark' ? '#2a2e39' : '#ffffff',
        padding: '10px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '5px'
      }}>
        <button 
          className={activeTool === 'line' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'line' ? null : 'line')}
          style={{ 
            margin: '0 2px', 
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
            margin: '0 2px', 
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
            margin: '0 2px', 
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
            margin: '0 2px', 
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
            margin: '0 2px', 
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
        
        {/* Color Picker Button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <button 
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ 
              margin: '0 2px', 
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
        
        {/* Line Width Display */}
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
      
      {chartReady && (
        <div 
          ref={drawingLayerRef}
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: chartDimensions.width,
            height: chartDimensions.height,
            cursor: activeTool ? 'crosshair' : 'default',
            zIndex: activeTool ? 15 : 1,
            backgroundColor: 'transparent',
            pointerEvents: activeTool ? 'auto' : 'none'
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