import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
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

interface Coordinate { x: number; y: number; }

interface RenderableDrawing {
  id: string;
  type: string;
  elements: JSX.Element[];
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
  const [renderableDrawings, setRenderableDrawings] = useState<RenderableDrawing[]>([]);
  
  const chartRef = useRef(chart);
  const seriesRef = useRef(series);
  const dimensionsRef = useRef(chartDimensions);
  
  // Update refs
  useEffect(() => {
    chartRef.current = chart;
    seriesRef.current = series;
    dimensionsRef.current = chartDimensions;
  });

  // Process saved drawings in effect - this runs when chart becomes available
  useEffect(() => {
    if (!chart || !series || chartDimensions.width === 0) {
      setRenderableDrawings([]);
      return;
    }

    const safeTimeToCoordinate = (time: number): number | null => {
      if (!chart?.timeScale()) return null;
      
      try {
        const chartTime = (time / 1000) as UTCTimestamp;
        const coord = chart.timeScale().timeToCoordinate(chartTime);
        return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
      } catch (error) {
        return null;
      }
    };

    const priceToCoordinate = (price: number): number | null => {
      if (!series) return null;
      
      try {
        const coord = series.priceToCoordinate(price);
        return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
      } catch (error) {
        return null;
      }
    };

    const createDrawingElement = (drawing: Drawing): RenderableDrawing | null => {
      if (!drawing.points || drawing.points.length === 0) {
        return null;
      }

      try {
        const coordinates: Coordinate[] = [];
        
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
        };

        const elements: JSX.Element[] = [];

        switch (drawing.type) {
          case 'freehand':
            if (coordinates.length < 2) return null;
            elements.push(
              <polyline
                key="freehand"
                {...commonProps}
                points={coordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
                fill="none"
              />
            );
            break;
          
          case 'line':
            if (coordinates.length !== 2) return null;
            elements.push(
              <line
                key="line"
                {...commonProps}
                x1={coordinates[0].x}
                y1={coordinates[0].y}
                x2={coordinates[1].x}
                y2={coordinates[1].y}
              />
            );
            break;
          
          case 'rectangle':
            if (coordinates.length !== 2) return null;
            const rectX = Math.min(coordinates[0].x, coordinates[1].x);
            const rectY = Math.min(coordinates[0].y, coordinates[1].y);
            const rectWidth = Math.abs(coordinates[1].x - coordinates[0].x);
            const rectHeight = Math.abs(coordinates[1].y - coordinates[0].y);
            elements.push(
              <rect
                key="rectangle"
                {...commonProps}
                x={rectX}
                y={rectY}
                width={rectWidth}
                height={rectHeight}
                fill="none"
              />
            );
            break;
          
          case 'circle':
            if (coordinates.length !== 2) return null;
            const centerX = coordinates[0].x;
            const centerY = coordinates[0].y;
            const radius = Math.sqrt(
              Math.pow(coordinates[1].x - coordinates[0].x, 2) + 
              Math.pow(coordinates[1].y - coordinates[0].y, 2)
            );
            elements.push(
              <circle
                key="circle"
                {...commonProps}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
              />
            );
            break;
          
          default:
            return null;
        }

        return {
          id: drawing.id,
          type: drawing.type,
          elements
        };
      } catch (error) {
        console.warn('Error creating drawing element:', error);
        return null;
      }
    };

    // Process saved drawings
    const newRenderableDrawings: RenderableDrawing[] = [];
    for (const drawing of drawings) {
      const renderable = createDrawingElement(drawing);
      if (renderable) {
        newRenderableDrawings.push(renderable);
      }
    }
    setRenderableDrawings(newRenderableDrawings);
  }, [drawings, viewportVersion, chartDimensions, chart, series]); // Include chart and series in dependencies

  // Handle current drawing separately for immediate responsiveness
  const renderCurrentDrawing = useCallback(() => {
    if (!currentDrawing || !currentDrawing.points || currentDrawing.points.length === 0) {
      return null;
    }

    // Use refs for current drawing to avoid direct chart/series access during render
    const safeTimeToCoordinate = (time: number): number | null => {
      const currentChart = chartRef.current;
      if (!currentChart?.timeScale()) return null;
      
      try {
        const chartTime = (time / 1000) as UTCTimestamp;
        const coord = currentChart.timeScale().timeToCoordinate(chartTime);
        return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
      } catch (error) {
        return null;
      }
    };

    const priceToCoordinate = (price: number): number | null => {
      const currentSeries = seriesRef.current;
      if (!currentSeries) return null;
      
      try {
        const coord = currentSeries.priceToCoordinate(price);
        return coord !== null && !isNaN(coord) && isFinite(coord) ? Math.round(coord) : null;
      } catch (error) {
        return null;
      }
    };

    try {
      const coordinates: Coordinate[] = [];
      
      for (const point of currentDrawing.points) {
        const x = safeTimeToCoordinate(point.time);
        const y = priceToCoordinate(point.price);
        
        if (x !== null && y !== null) {
          coordinates.push({ x, y });
        }
      }

      if (coordinates.length === 0) return null;

      const commonProps = {
        stroke: currentDrawing.color,
        strokeWidth: currentDrawing.width,
        fill: 'none' as const,
        vectorEffect: 'non-scaling-stroke' as const,
      };

      switch (currentDrawing.type) {
        case 'freehand':
          if (coordinates.length < 2) return null;
          return (
            <polyline
              key="current-freehand"
              {...commonProps}
              points={coordinates.map(coord => `${coord.x},${coord.y}`).join(' ')}
              fill="none"
            />
          );
        
        case 'line':
          if (coordinates.length !== 2) return null;
          return (
            <line
              key="current-line"
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
              key="current-rectangle"
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
              key="current-circle"
              {...commonProps}
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
            />
          );
        
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error rendering current drawing:', error);
      return null;
    }
  }, [currentDrawing]);

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
      {renderableDrawings.map(drawing => (
        <g key={drawing.id}>
          {drawing.elements}
        </g>
      ))}
      
      {/* Render current drawing in progress - calculated during render for immediate response */}
      {renderCurrentDrawing()}
    </svg>
  );
};

export default React.memo(DrawingSurface);