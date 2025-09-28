import React, { useCallback } from 'react';
import { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Drawing } from '../../types';

interface DrawingSurfaceProps {
  chart: IChartApi;
  series: ISeriesApi<'Candlestick'>;
  drawings: Drawing[];
  currentDrawing: Drawing | null;
  chartDimensions: { width: number; height: number };
  isDrawing: boolean;
  activeTool: string | null;
  viewportVersion: number;
}

const DrawingSurface: React.FC<DrawingSurfaceProps> = ({
  chart,
  series,
  drawings,
  currentDrawing,
  chartDimensions,
  isDrawing,
  activeTool,
  viewportVersion,
}) => {
  const safeTimeToCoordinate = useCallback((time: number): number | null => {
    if (!chart?.timeScale()) return null;
    
    try {
      const chartTime = (time / 1000) as UTCTimestamp;
      const coord = chart.timeScale().timeToCoordinate(chartTime);
      return coord !== null && !isNaN(coord) && isFinite(coord) ? coord : null;
    } catch (error) {
      return null;
    }
  }, [chart]);

  const priceToCoordinate = useCallback((price: number): number | null => {
    if (!series) return null;
    
    try {
      const coord = series.priceToCoordinate(price);
      return coord !== null && !isNaN(coord) && isFinite(coord) ? coord : null;
    } catch (error) {
      return null;
    }
  }, [series]);

  const renderDrawing = useCallback((drawing: Drawing) => {
  if (!drawing.points || drawing.points.length === 0) {
    return null;
  }

  try {
    // Get valid coordinates
    const coordinates: {x: number; y: number}[] = [];
    
    for (const point of drawing.points) {
      const x = safeTimeToCoordinate(point.time);
      const y = priceToCoordinate(point.price);
      
      if (x !== null && y !== null) {
        coordinates.push({ x, y });
      }
    }

    if (coordinates.length === 0) return null;

    const commonProps = {
      stroke: drawing.color,
      strokeWidth: drawing.width,
      fill: 'none' as const,
      vectorEffect: 'non-scaling-stroke' as const,
      key: `${drawing.id}-${viewportVersion}`
    };

    switch (drawing.type) {
      case 'freehand':
        if (coordinates.length < 2) return null;
        return (
          <polyline
            {...commonProps}
            points={coordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
          />
        );
        
      case 'line':
        if (coordinates.length < 2) return null;
        return (
          <line
            {...commonProps}
            x1={coordinates[0].x}
            y1={coordinates[0].y}
            x2={coordinates[1].x}
            y2={coordinates[1].y}
          />
        );
        
      case 'rectangle':
        if (coordinates.length < 2) return null;
        const minX = Math.min(coordinates[0].x, coordinates[1].x);
        const minY = Math.min(coordinates[0].y, coordinates[1].y);
        const width = Math.abs(coordinates[1].x - coordinates[0].x);
        const height = Math.abs(coordinates[1].y - coordinates[0].y);
        
        return (
          <rect
            {...commonProps}
            x={minX}
            y={minY}
            width={width}
            height={height}
          />
        );
        
      case 'circle':
        if (coordinates.length < 2) return null;
        const dx = coordinates[1].x - coordinates[0].x;
        const dy = coordinates[1].y - coordinates[0].y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        
        return (
          <circle
            {...commonProps}
            cx={coordinates[0].x}
            cy={coordinates[0].y}
            r={radius}
          />
        );
        
      default:
        return null;
    }
  } catch (error) {
    console.error('Error rendering drawing:', error);
    return null;
  }
}, [safeTimeToCoordinate, priceToCoordinate, viewportVersion]);

  if (!chart || !series || chartDimensions.width === 0 || chartDimensions.height === 0) {
    return null;
  }

  return (
    <svg
      width={chartDimensions.width}
      height={chartDimensions.height}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none' // SVG itself doesn't capture events
      }}
      key={`drawing-surface-${viewportVersion}`}
    >
      {/* Render all saved drawings */}
      {drawings.map(drawing => renderDrawing(drawing))}
      
      {/* Render current drawing in progress */}
      {currentDrawing && renderDrawing(currentDrawing)}
    </svg>
  );
};

export default DrawingSurface;