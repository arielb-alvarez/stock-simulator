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
  const drawingLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkChartReady = () => {
      if (chart && series && chart.timeScale() && isChartReady) {
        // Additional check to ensure time scale is properly initialized
        try {
          const timeScale = chart.timeScale();
          if (timeScale.width() > 0) {
            setChartReady(true);
            console.log('Chart is now ready with data and proper scaling');
            return;
          }
        } catch (e) {
          console.log('Time scale not fully initialized yet');
        }
      }
      setTimeout(checkChartReady, 100);
    };
    
    checkChartReady();
  }, [chart, series, isChartReady]);

  // Safe time conversion function
  const safeTimeToCoordinate = (time: number): number | null => {
    if (!chart || !chart.timeScale()) {
      console.log('Chart or timeScale not available');
      return null;
    }
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
    e.preventDefault();
    e.stopPropagation();
    
    if (!activeTool || activeTool === 'eraser' || !chartReady) return;
    
    const pos = getMousePosition(e);
    if (!pos) return;

    setIsDrawing(true);

    // Start new drawing
    const newDrawing: Drawing = {
      id: Date.now().toString(),
      type: activeTool as any,
      points: [{ time: pos.time, price: pos.price }],
      color: theme === 'dark' ? '#FFFFFF' : '#000000',
      width: 2
    };
    setCurrentDrawing(newDrawing);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing || !currentDrawing || !chartReady) return;
    
    const pos = getMousePosition(e);
    if (!pos) {
      console.log('Invalid mouse position during move');
      return;
    }

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
    e.preventDefault();
    if (!currentDrawing) return;
    
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

  // Update the renderDrawings function
  const renderDrawings = () => {
    if (!chartReady) {
      console.log('Chart not ready');
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
          // Convert all points to coordinates first
          const coordinates = drawing.points.map(point => ({
            x: safeTimeToCoordinate(point.time),
            y: priceToCoordinate(point.price)
          }));
          
          // Skip if any coordinates are invalid or NaN
          if (coordinates.some(coord => coord.x === null || coord.y === null || isNaN(coord.x) || isNaN(coord.y))) {
            console.log('Skipping drawing with invalid coordinates');
            return null;
          }
          
          // Cast coordinates to valid numbers
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

  return (
    <div className="drawing-tools">
      <div className="tools">
        <button 
          className={activeTool === 'line' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'line' ? null : 'line')}
        >
          Line
        </button>
        <button 
          className={activeTool === 'rectangle' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'rectangle' ? null : 'rectangle')}
        >
          Rectangle
        </button>
        <button 
          className={activeTool === 'circle' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'circle' ? null : 'circle')}
        >
          Circle
        </button>
        <button 
          className={activeTool === 'freehand' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'freehand' ? null : 'freehand')}
        >
          Pen
        </button>
        <button 
          className={activeTool === 'eraser' ? 'active' : ''}
          onClick={() => onToolSelect(activeTool === 'eraser' ? null : 'eraser')}
        >
          Eraser
        </button>
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
            zIndex: 10, // Reduced from 100
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