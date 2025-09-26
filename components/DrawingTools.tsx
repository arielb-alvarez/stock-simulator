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
  isMobile: boolean;
}

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF',
  '#00FFFF', '#FFA500', '#800080', '#008000', '#000080',
  '#FFFFFF', '#000000', '#FFC0CB', '#A52A2A', '#808080',
];

// Icon components
const LineIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
);

const RectangleIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
  </svg>
);

const CircleIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const PenIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </svg>
);

const EraserIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M7 21l-5-5 5-5h12a2 2 0 0 1 0 4H7z" />
  </svg>
);

const ColorPaletteIcon = ({ color = 'currentColor', size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="9" cy="9" r="7" />
    <circle cx="15" cy="15" r="7" />
    <path d="M9 9l6 6" />
  </svg>
);

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
  visibleRange,
  isMobile
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!activeTool || activeTool === 'eraser' || !chartReady) return;
    
    const pos = getMousePosition(e);
    if (!pos) return;

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
      updatedDrawing = {
        ...currentDrawing,
        points: [...currentDrawing.points, { time: pos.time, price: pos.price }]
      };
    } else {
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
    svgKeyRef.current++;
  }, [isDrawing, currentDrawing, chartReady, getMousePosition]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isDrawing || !currentDrawing) return;

    e.preventDefault();
    e.stopPropagation();

    setIsDrawing(false);

    if (currentDrawing.points && currentDrawing.points.length > 0) {
      const completedDrawing: Drawing = {
        ...currentDrawing,
        createdAt: Date.now()
      };
      
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
          top: '0',
          left: '50px', // Position to the right of the color button
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
      <div 
        className="tools-vertical"
        style={{ 
          background: theme === 'dark' ? 'rgba(42, 46, 57, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          color: theme === 'dark' ? '#fff' : '#000',
        }}
      >
        {/* Line Tool */}
        <button 
          className={`tool-button ${activeTool === 'line' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'line' ? null : 'line')}
          title="Line Tool"
        >
          <LineIcon color={activeTool === 'line' ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
        </button>
        
        {/* Rectangle Tool */}
        <button 
          className={`tool-button ${activeTool === 'rectangle' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'rectangle' ? null : 'rectangle')}
          title="Rectangle Tool"
        >
          <RectangleIcon color={activeTool === 'rectangle' ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
        </button>
        
        {/* Circle Tool */}
        <button 
          className={`tool-button ${activeTool === 'circle' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'circle' ? null : 'circle')}
          title="Circle Tool"
        >
          <CircleIcon color={activeTool === 'circle' ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
        </button>
        
        {/* Freehand Tool */}
        <button 
          className={`tool-button ${activeTool === 'freehand' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'freehand' ? null : 'freehand')}
          title="Freehand Tool"
        >
          <PenIcon color={activeTool === 'freehand' ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
        </button>
        
        {/* Eraser Tool */}
        <button 
          className={`tool-button ${activeTool === 'eraser' ? 'active' : ''}`}
          onClick={() => onToolSelect(activeTool === 'eraser' ? null : 'eraser')}
          title="Eraser Tool"
        >
          <EraserIcon color={activeTool === 'eraser' ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
        </button>
        
        <div style={{ 
          width: '100%', 
          height: '1px', 
          backgroundColor: theme === 'dark' ? '#444' : '#ccc',
          margin: '4px 0'
        }} />
        
        {/* Color Picker - This doesn't set an active tool */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <button 
            className={`tool-button ${showColorPicker ? 'active' : ''}`}
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Color Picker"
          >
            <ColorPaletteIcon color={showColorPicker ? (theme === 'dark' ? '#fff' : '#000') : (theme === 'dark' ? '#ccc' : '#666')} />
          </button>
          {showColorPicker && renderColorPicker()}
        </div>
        
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: '10px',
          color: theme === 'dark' ? '#ccc' : '#666',
          marginTop: '4px'
        }}>
          <span>Width</span>
          <span>{lineWidth}px</span>
        </div>
      </div>
      
      {/* Drawing Layer */}
      {chartReady && (
        <div 
          ref={drawingLayerRef}
          className="drawing-surface"
          style={{ 
            cursor: isDrawing ? 'crosshair' : (activeTool ? 'crosshair' : 'default'),
            pointerEvents: activeTool && !showColorPicker ? 'auto' : 'none',
          }}
          onMouseDown={activeTool ? (activeTool === 'eraser' ? handleEraserClick : handleMouseDown) : undefined}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            width={chartDimensions.width}
            height={chartDimensions.height}
            style={{ pointerEvents: 'none' }}
            key={`drawings-${svgKeyRef.current}`}
          >
            {renderSavedDrawings()}
            {renderCurrentDrawing()}
          </svg>
        </div>
      )}
    </div>
  );
};

export default DrawingTools;