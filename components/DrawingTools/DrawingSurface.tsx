import React, { useCallback, useMemo } from 'react';
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
      return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
    } catch (error) {
      console.warn('Error converting time to coordinate:', error, time);
      return null;
    }
  }, [chart]);

  const priceToCoordinate = useCallback((price: number): number | null => {
    if (!series) return null;
    
    try {
      const coord = series.priceToCoordinate(price);
      return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
    } catch (error) {
      console.warn('Error converting price to coordinate:', error, price);
      return null;
    }
  }, [series]);

  // Filter out invalid drawings and convert to renderable format
  const renderableDrawings = useMemo(() => {
    return drawings.filter(drawing => {
      if (!drawing.points || drawing.points.length === 0) return false;
      
      // Check if at least one point is valid and visible
      return drawing.points.some(point => {
        const x = safeTimeToCoordinate(point.time);
        const y = priceToCoordinate(point.price);
        return x !== null && y !== null;
      });
    });
  }, [drawings, safeTimeToCoordinate, priceToCoordinate]);

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
              fill="none"
            />
          );
        
        case 'line':
          if (coordinates.length !== 2) return null;
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
          if (coordinates.length !== 2) return null;
          const rectX = Math.min(coordinates[0].x, coordinates[1].x);
          const rectY = Math.min(coordinates[0].y, coordinates[1].y);
          const rectWidth = Math.abs(coordinates[1].x - coordinates[0].x);
          const rectHeight = Math.abs(coordinates[1].y - coordinates[0].y);
          return (
            <rect
              {...commonProps}
              x={rectX}
              y={rectY}
              width={rectWidth}
              height={rectHeight}
              fill="none"
            />
          );
        
        case 'circle':
          if (coordinates.length !== 2) return null;
          const centerX = coordinates[0].x;
          const centerY = coordinates[0].y;
          const radius = Math.sqrt(
            Math.pow(coordinates[1].x - coordinates[0].x, 2) + 
            Math.pow(coordinates[1].y - coordinates[0].y, 2)
          );
          return (
            <circle
              {...commonProps}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
            />
          );
        
        default:
          console.warn('Unknown drawing type:', drawing.type);
          return null;
      }
    } catch (error) {
      console.error('Error rendering drawing:', error, drawing);
      return null;
    }
  }, [safeTimeToCoordinate, priceToCoordinate, viewportVersion, chartDimensions]);

  // Render current drawing separately to ensure it's always visible
  const renderCurrentDrawing = useCallback(() => {
    if (!currentDrawing) return null;
    return renderDrawing(currentDrawing);
  }, [currentDrawing, renderDrawing]);

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
        pointerEvents: 'none',
        overflow: 'visible'
      }}
      key={`drawing-surface-${viewportVersion}`}
    >
      {/* Render all saved drawings */}
      {renderableDrawings.map(drawing => renderDrawing(drawing))}
      
      {/* Render current drawing in progress */}
      {renderCurrentDrawing()}
    </svg>
  );
};

export default DrawingSurface;